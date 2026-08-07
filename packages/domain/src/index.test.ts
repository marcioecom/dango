import { describe, expect, it } from "vitest";

import { createCaptureSchema, generationOutputSchema, sentenceContainsTarget } from "./index";

describe("capture contracts", () => {
  it("normalizes empty optional fields without changing the captured text", () => {
    const capture = createCaptureSchema.parse({
      id: "f72e13df-b525-4f1d-a35d-8d9f2ad3ae63",
      originalSentence: " ",
      source: " Netflix ",
      text: " get away with ",
    });

    expect(capture).toEqual({
      id: "f72e13df-b525-4f1d-a35d-8d9f2ad3ae63",
      originalSentence: null,
      source: "Netflix",
      text: "get away with",
    });
  });

  it("requires exactly five generated sentences", () => {
    const result = generationOutputSchema.safeParse({
      explanation: "Explicação",
      sentences: ["One sentence."],
      translation: "Tradução",
    });

    expect(result.success).toBe(false);
  });

  it("recognizes the expression as a lexical unit", () => {
    expect(sentenceContainsTarget("He thought he could get away with it.", "get away with")).toBe(true);
    expect(sentenceContainsTarget("The cat left.", "he")).toBe(false);
  });
});
