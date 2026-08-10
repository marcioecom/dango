import { describe, expect, it } from "vitest";

import { createCaptureSchema, generationOutputSchema, sentenceContainsTarget } from "./index";

describe("capture contracts", () => {
  it("normalizes empty optional fields without changing the captured text", () => {
    const capture = createCaptureSchema.parse({
      id: "f72e13df-b525-4f1d-a35d-8d9f2ad3ae63",
      kind: "term",
      originalSentence: " ",
      source: " Netflix ",
      text: " get away with ",
    });

    expect(capture).toEqual({
      id: "f72e13df-b525-4f1d-a35d-8d9f2ad3ae63",
      kind: "term",
      originalSentence: null,
      source: "Netflix",
      text: "get away with",
    });
  });

  it("requires exactly five generated examples", () => {
    const result = generationOutputSchema.safeParse({
      examples: Array.from({ length: 4 }, (_, index) => ({
        sentenceEn: `Example ${index + 1} with target.`,
        targetForm: "target",
        translationPtBr: `Exemplo ${index + 1} com alvo.`,
      })),
      explanationPtBr: "Explicação",
      translationsPtBr: [{ text: "alvo" }],
    });

    expect(result.success).toBe(false);
  });

  it("recognizes the expression as a lexical unit", () => {
    expect(sentenceContainsTarget("He thought he could get away with it.", "get away with")).toBe(true);
    expect(sentenceContainsTarget("The cat left.", "he")).toBe(false);
  });
});
