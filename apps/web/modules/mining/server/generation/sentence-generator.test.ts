import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const getGenerationInfo = vi.fn();
  const gateway = Object.assign(vi.fn((model: string) => ({ model })), { getGenerationInfo });

  return {
    gateway,
    generateText: vi.fn(),
    getGenerationInfo,
    outputObject: vi.fn((options: unknown) => options),
  };
});

vi.mock("@ai-sdk/gateway", () => ({ gateway: mocks.gateway }));
vi.mock("ai", () => ({
  generateText: mocks.generateText,
  Output: { object: mocks.outputObject },
}));

import { InvalidGenerationOutputError } from "./generation-errors";
import { SENTENCE_GENERATION_SYSTEM_PROMPT } from "./generation-prompt";
import {
  DEFAULT_MODEL,
  FALLBACK_MODEL,
  generateSentenceOptions,
} from "./sentence-generator";

describe("generateSentenceOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGenerationInfo.mockResolvedValue({ totalCost: "0.001" });
  });

  it("delegates model fallback to AI Gateway and records the serving model", async () => {
    const captureId = "f72e13df-b525-4f1d-a35d-8d9f2ad3ae63";
    mocks.generateText.mockResolvedValue({
      output: {
        items: [
          {
            captureId,
            examples: Array.from({ length: 5 }, (_, index) => ({
              sentenceEn: `Example ${index + 1} contains target.`,
              targetForm: "target",
              translationPtBr: `Exemplo ${index + 1} contém alvo.`,
            })),
            explanationPtBr: "Explicação",
            sentenceTranslationPtBr: "Alvo.",
            translationsPtBr: [{ text: "alvo" }],
          },
        ],
      },
      providerMetadata: { gateway: { generationId: "generation-1" } },
      response: { modelId: FALLBACK_MODEL },
      usage: { inputTokens: 10, outputTokens: 20 },
    });

    const result = await generateSentenceOptions({
      captures: [
        {
          id: captureId,
          kind: "sentence",
          originalSentence: null,
          source: null,
          text: "target",
        },
      ],
      timeoutMs: 60_000,
    });

    expect(mocks.gateway).toHaveBeenCalledWith(DEFAULT_MODEL);
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { model: DEFAULT_MODEL },
        providerOptions: {
          gateway: { models: [FALLBACK_MODEL] },
          openai: { reasoningEffort: "low" },
        },
        system: SENTENCE_GENERATION_SYSTEM_PROMPT,
        timeout: 60_000,
      }),
    );
    expect(result.model).toBe(FALLBACK_MODEL);
    expect(result.outputs.get(captureId)?.examples).toHaveLength(5);
    expect(result.usage).toEqual({
      inputTokens: 10,
      latencyMs: expect.any(Number),
      outputTokens: 20,
      reportedCostUsd: "0.001",
    });
  });

  it("rejects examples whose target form is absent from the sentence", async () => {
    const captureId = "f72e13df-b525-4f1d-a35d-8d9f2ad3ae63";
    mocks.generateText.mockResolvedValue({
      output: {
        items: [
          {
            ambiguityNotePtBr: null,
            captureId,
            examples: Array.from({ length: 5 }, (_, index) => ({
              sentenceEn: `Example ${index + 1} without it.`,
              targetForm: "target",
              translationPtBr: `Exemplo ${index + 1}.`,
            })),
            explanationPtBr: "Explicação",
            originalSentenceTranslationPtBr: null,
            sentenceTranslationPtBr: "Alvo.",
            translationsPtBr: [],
          },
        ],
      },
      providerMetadata: {},
      response: { modelId: DEFAULT_MODEL },
      usage: { inputTokens: 10, outputTokens: 20 },
    });

    await expect(
      generateSentenceOptions({
        captures: [
          {
            id: captureId,
            kind: "sentence",
            originalSentence: null,
            source: null,
            text: "target",
          },
        ],
        timeoutMs: 60_000,
      }),
    ).rejects.toBeInstanceOf(InvalidGenerationOutputError);
  });
});
