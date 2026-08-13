import { env } from "@/lib/env";
import { gateway, type GatewayProviderOptions } from "@ai-sdk/gateway";
import { sentenceContainsTarget, type GenerationOutput } from "@dango/domain";
import { generateText, Output } from "ai";

import { InvalidGenerationOutputError } from "./generation-errors";
import {
  generationResponseSchema,
  toGenerationOutput,
  type GenerationResponseItem,
} from "./generation-output-schema";
import {
  buildGenerationPrompt,
  buildGenerationSystemPrompt,
  type GenerationCaptureInput,
} from "./generation-prompt";
import { fetchReportedCostUsd } from "./generation-telemetry";

export const DEFAULT_MODEL = env.DEFAULT_MODEL;
export const FALLBACK_MODEL = env.FALLBACK_MODEL;

export type GenerationUsage = {
  inputTokens: number | null;
  latencyMs: number;
  outputTokens: number | null;
  reportedCostUsd: string | null;
};

export type SentenceGenerator = (input: {
  captures: GenerationCaptureInput[];
  timeoutMs: number;
}) => Promise<{
  model: string;
  outputs: Map<string, GenerationOutput>;
  usage: GenerationUsage;
}>;

const gatewayOptions = {
  models: [FALLBACK_MODEL],
} satisfies GatewayProviderOptions;

export const generateSentenceOptions: SentenceGenerator = async (input) => {
  const startedAt = performance.now();
  const result = await generateText({
    model: gateway(DEFAULT_MODEL),
    output: Output.object({ schema: generationResponseSchema }),
    providerOptions: { gateway: gatewayOptions },
    system: buildGenerationSystemPrompt(),
    prompt: buildGenerationPrompt(input.captures),
    timeout: input.timeoutMs,
  });

  const servedModel = result.response.modelId;
  if (servedModel !== DEFAULT_MODEL) {
    console.warn("[sentence-generator] fallback model served the request", {
      requestedModel: DEFAULT_MODEL,
      servedModel,
    });
  }

  const outputs = validateOutputs(result.output.items, input.captures);

  return {
    model: servedModel,
    outputs,
    usage: {
      inputTokens: result.usage.inputTokens ?? null,
      latencyMs: Math.round(performance.now() - startedAt),
      outputTokens: result.usage.outputTokens ?? null,
      reportedCostUsd: await fetchReportedCostUsd(
        result.providerMetadata?.gateway?.generationId,
      ),
    },
  };
};

function validateOutputs(
  items: GenerationResponseItem[],
  captures: GenerationCaptureInput[],
) {
  const outputs = new Map<string, GenerationOutput>();
  for (const item of items) {
    if (outputs.has(item.captureId)) {
      throw new InvalidGenerationOutputError(
        "The generated output contains a duplicate capture.",
      );
    }
    const capture = captures.find(
      (candidate) => candidate.id === item.captureId,
    );
    if (capture?.kind === "sentence" && !item.sentenceTranslationPtBr) {
      throw new InvalidGenerationOutputError(
        "The generated output does not translate the captured sentence.",
      );
    }
    for (const example of item.examples) {
      if (!sentenceContainsTarget(example.sentenceEn, example.targetForm)) {
        throw new InvalidGenerationOutputError(
          "The generated target form is not present in its example.",
        );
      }
    }
    outputs.set(item.captureId, toGenerationOutput(item));
  }
  if (
    outputs.size !== captures.length ||
    captures.some((capture) => !outputs.has(capture.id))
  ) {
    throw new InvalidGenerationOutputError(
      "The generated output does not match the requested captures.",
    );
  }
  return outputs;
}
