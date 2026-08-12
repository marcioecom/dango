import { describe, expect, it } from "vitest";

import {
  approveCaptureSchema,
  approvedCardSchema,
  createCaptureSchema,
  generationOutputSchema,
  sentenceContainsTarget,
} from "./index";

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

  it("preserves the exact target form when approving a sentence", () => {
    const approval = approveCaptureSchema.parse({
      generationId: "3c22ff97-b325-4643-983a-e5611acd6487",
      id: "53645f74-46c5-4027-b12b-dcda681ceea2",
      sentence: "She turned down the offer politely.",
      source: "generated",
      targetForm: "turned down",
    });

    expect(approval.targetForm).toBe("turned down");
  });

  it("requires a complete approved card payload for desktop sync", () => {
    const result = approvedCardSchema.safeParse({
      approvalId: "53645f74-46c5-4027-b12b-dcda681ceea2",
      approvedAt: "2026-08-10T20:00:00.000Z",
      captureId: "f72e13df-b525-4f1d-a35d-8d9f2ad3ae63",
      remoteStatus: "approved",
      sentence: "She turned down the offer politely.",
      targetForm: "turned down",
      targetText: "turn down",
      translationsPtBr: ["recusar"],
    });

    expect(result.success).toBe(true);
  });
});
