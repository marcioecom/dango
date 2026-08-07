import { generationOutputSchema, type GenerationOutput } from "@dango/domain";
import { gateway } from "@ai-sdk/gateway";
import { generateText, Output } from "ai";

export const PROMPT_VERSION = "sentence-mining-v1";
export const DEFAULT_MODEL = "openai/gpt-5-mini";
export const FALLBACK_MODEL = "google/gemini-2.5-flash";

export type GenerationUsage = {
  inputTokens: number | null;
  latencyMs: number;
  outputTokens: number | null;
  reportedCostUsd: string | null;
};

export type SentenceGenerator = (input: {
  model: string;
  originalSentence: string | null;
  source: string | null;
  text: string;
  timeoutMs: number;
}) => Promise<{ output: GenerationOutput; usage: GenerationUsage }>;

export const generateSentenceOptions: SentenceGenerator = async (input) => {
  const startedAt = performance.now();
  const result = await generateText({
    model: gateway(input.model),
    output: Output.object({ schema: generationOutputSchema }),
    system: [
      "You create natural English sentence-mining material for a Brazilian Portuguese learner.",
      "Explain the target in Brazilian Portuguese and translate its meaning in the supplied context.",
      "Return exactly five varied, natural English example sentences that preserve the target expression exactly as written when grammar allows.",
      "Do not include markdown, labels, or commentary outside the requested structured output.",
    ].join(" "),
    prompt: JSON.stringify({
      originalSentence: input.originalSentence,
      source: input.source,
      target: input.text,
    }),
    timeout: input.timeoutMs,
  });

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
    output: result.output,
    usage: {
      inputTokens: result.usage.inputTokens ?? null,
      latencyMs: Math.round(performance.now() - startedAt),
      outputTokens: result.usage.outputTokens ?? null,
      reportedCostUsd,
    },
  };
};
