import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildApprovedCard, buildApprovedCardList } from "./deliveries";

describe("approved card projection", () => {
  it("uses the exact generation and target form referenced by the approval", () => {
    const card = buildApprovedCard({
      approval: {
        approvedAt: new Date("2026-08-10T20:00:00.000Z"),
        id: "53645f74-46c5-4027-b12b-dcda681ceea2",
        sentence: "She turned down the offer politely.",
        source: "generated",
        targetForm: "turned down",
      },
      capture: {
        id: "f72e13df-b525-4f1d-a35d-8d9f2ad3ae63",
        kind: "term",
        status: "approved",
        text: "turn down",
      },
      generation: {
        examples: [
          {
            sentenceEn: "She turned down the offer politely.",
            targetForm: "turned down",
            translationPtBr: "Ela recusou a oferta educadamente.",
          },
        ],
        sentenceTranslationPtBr: null,
        status: "succeeded",
        translationsPtBr: [{ text: "recusar" }],
      },
    });

    expect(card).toMatchObject({
      remoteStatus: "approved",
      targetForm: "turned down",
      translationsPtBr: ["recusar"],
    });
  });

  it("rejects an approval whose target cannot be recovered", () => {
    expect(() =>
      buildApprovedCard({
        approval: {
          approvedAt: new Date(),
          id: "53645f74-46c5-4027-b12b-dcda681ceea2",
          sentence: "This sentence no longer contains it.",
          source: "edited",
          targetForm: null,
        },
        capture: {
          id: "f72e13df-b525-4f1d-a35d-8d9f2ad3ae63",
          kind: "term",
          status: "approved",
          text: "turn down",
        },
        generation: {
          examples: [],
          sentenceTranslationPtBr: null,
          status: "succeeded",
          translationsPtBr: [{ text: "recusar" }],
        },
      }),
    ).toThrow("A frase aprovada não identifica a expressão");
  });

  it("does not let one incompatible legacy approval block valid cards", () => {
    const valid = record();
    const invalid = record();
    invalid.approval.id = "7de4bb2e-2b89-492e-a9b8-d1828f38eaa2";
    invalid.capture.id = "30c075d3-5707-4784-8e56-7ef4b23a5739";
    invalid.approval.sentence = "This no longer contains the target.";
    invalid.approval.targetForm = null;

    const result = buildApprovedCardList([valid, invalid]);

    expect(result.cards).toHaveLength(1);
    expect(result.issues).toEqual([
      {
        approvalId: invalid.approval.id,
        captureId: invalid.capture.id,
        code: "APPROVAL_TARGET_MISSING",
      },
    ]);
  });
});

function record() {
  return {
    approval: {
      approvedAt: new Date("2026-08-10T20:00:00.000Z"),
      id: "53645f74-46c5-4027-b12b-dcda681ceea2",
      sentence: "She turned down the offer politely.",
      source: "generated",
      targetForm: "turned down" as string | null,
    },
    capture: {
      id: "f72e13df-b525-4f1d-a35d-8d9f2ad3ae63",
      kind: "term",
      status: "approved",
      text: "turn down",
    },
    generation: {
      examples: [
        {
          sentenceEn: "She turned down the offer politely.",
          targetForm: "turned down",
          translationPtBr: "Ela recusou a oferta educadamente.",
        },
      ],
      sentenceTranslationPtBr: null,
      status: "succeeded",
      translationsPtBr: [{ text: "recusar" }],
    },
  };
}
