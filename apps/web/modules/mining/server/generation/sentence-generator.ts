import { env } from "@/lib/env";
import { gateway, type GatewayProviderOptions } from "@ai-sdk/gateway";
import {
  generationBatchOutputSchema,
  sentenceContainsTarget,
  type GenerationOutput,
} from "@dango/domain";
import { generateText, Output } from "ai";

export const PROMPT_VERSION = "sentence-mining-v1";
export const DEFAULT_MODEL = env.DEFAULT_MODEL;
export const FALLBACK_MODEL = env.FALLBACK_MODEL;

const EXAMPLE_COUNT = 5;

export type GenerationUsage = {
  inputTokens: number | null;
  latencyMs: number;
  outputTokens: number | null;
  reportedCostUsd: string | null;
};

export type SentenceGenerator = (input: {
  captures: Array<{
    id: string;
    kind: "sentence" | "term";
    originalSentence: string | null;
    source: string | null;
    text: string;
  }>;
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
    output: Output.object({ schema: generationBatchOutputSchema }),
    providerOptions: { gateway: gatewayOptions },
    system: [
      "You create natural English sentence-mining material for a Brazilian Portuguese learner.",
      "Choose one meaning for the target: the meaning established by the original sentence, or its most common meaning when no context is supplied.",
      "Write a short Brazilian Portuguese explanation for that one meaning only. Do not enumerate unrelated meanings.",
      "For a sentence capture, use sentenceTranslationPtBr for its full Brazilian Portuguese translation. For a term capture, return one or more Brazilian Portuguese translations as structured values, not a comma-separated sentence.",
      "For a term capture with originalSentence, include originalSentenceTranslationPtBr.",
      "Return the requested number of varied, natural English examples. Each example must include the target or a grammatical inflection, identify the exact form used in targetForm, and include a Brazilian Portuguese translation.",
      "Use ambiguityNotePtBr only when context is absent and a brief clarification genuinely helps.",
      "Return one item for every supplied captureId and do not omit or duplicate captureIds.",
      "Do not include markdown or commentary outside the structured output.",
    ].join(" "),
    prompt: JSON.stringify({
      captures: input.captures.map((capture) => ({
        ...capture,
        exampleCount: EXAMPLE_COUNT,
      })),
    }),
    timeout: input.timeoutMs,
  });

  const outputs = new Map<string, GenerationOutput>();
  for (const item of result.output.items) {
    if (outputs.has(item.captureId))
      throw new Error("The generated output contains a duplicate capture.");
    const capture = input.captures.find(
      (candidate) => candidate.id === item.captureId,
    );
    if (item.examples.length !== EXAMPLE_COUNT) {
      throw new Error(
        "The generated output must contain exactly five examples.",
      );
    }
    if (capture?.kind === "sentence" && !item.sentenceTranslationPtBr) {
      throw new Error(
        "The generated output does not translate the captured sentence.",
      );
    }
    for (const example of item.examples) {
      if (!sentenceContainsTarget(example.sentenceEn, example.targetForm)) {
        throw new Error(
          "The generated target form is not present in its example.",
        );
      }
    }
    const { captureId, ...output } = item;
    outputs.set(captureId, output);
  }
  if (
    outputs.size !== input.captures.length ||
    input.captures.some((capture) => !outputs.has(capture.id))
  ) {
    throw new Error(
      "The generated output does not match the requested captures.",
    );
  }

  const generationId = result.providerMetadata?.gateway?.generationId;
  let reportedCostUsd: string | null = null;
  if (typeof generationId === "string") {
    try {
      const info = await gateway.getGenerationInfo({ id: generationId });
      reportedCostUsd = String(info.totalCost);
    } catch {
      // Cost lookup is best-effort; token usage is still retained.
    }
  }

  return {
    model: result.response.modelId,
    outputs,
    usage: {
      inputTokens: result.usage.inputTokens ?? null,
      latencyMs: Math.round(performance.now() - startedAt),
      outputTokens: result.usage.outputTokens ?? null,
      reportedCostUsd,
    },
  };
};
