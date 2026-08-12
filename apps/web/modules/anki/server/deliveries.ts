import {
  sentenceContainsTarget,
  type AnkiDeliveryReceipt,
  type AnkiRemoteStatus,
  type ApprovedCard,
  type GenerationExample,
  type GenerationTranslation,
} from "@dango/domain";
import { and, eq, inArray } from "drizzle-orm";

import { database } from "@/db/runtime";
import { approvals, captures, generations } from "@/db/schema/mining";
import { MiningError } from "@/modules/mining/shared/server/errors";

type ApprovedCardRecord = {
  approval: {
    approvedAt: Date;
    id: string;
    sentence: string;
    source: string;
    targetForm: string | null;
  };
  capture: {
    id: string;
    kind: string;
    status: string;
    text: string;
  };
  generation: {
    examples: GenerationExample[] | null;
    sentenceTranslationPtBr: string | null;
    status: string;
    translationsPtBr: GenerationTranslation[] | null;
  };
};

export async function listApprovedCards(userId: string) {
  const rows = await database
    .select({ approval: approvals, capture: captures, generation: generations })
    .from(approvals)
    .innerJoin(
      captures,
      and(eq(captures.id, approvals.captureId), eq(captures.userId, userId)),
    )
    .innerJoin(
      generations,
      and(
        eq(generations.id, approvals.generationId),
        eq(generations.captureId, approvals.captureId),
        eq(generations.userId, userId),
      ),
    )
    .where(
      and(
        eq(approvals.userId, userId),
        inArray(captures.status, ["approved", "pending_anki"]),
      ),
    );

  return buildApprovedCardList(rows);
}

export async function markCardPending(
  userId: string,
  captureId: string,
  approvalId: string,
): Promise<AnkiDeliveryReceipt> {
  return transitionCard(
    userId,
    captureId,
    approvalId,
    "approved",
    "pending_anki",
  );
}

export async function markCardSent(
  userId: string,
  captureId: string,
  approvalId: string,
): Promise<AnkiDeliveryReceipt> {
  return transitionCard(
    userId,
    captureId,
    approvalId,
    "pending_anki",
    "sent_to_anki",
  );
}

export function buildApprovedCard(record: ApprovedCardRecord): ApprovedCard {
  if (record.generation.status !== "succeeded") {
    throw new MiningError(
      "GENERATION_NOT_READY",
      "A geração aprovada não está disponível.",
      409,
    );
  }

  const matchedExample = record.generation.examples?.find(
    (example) => example.sentenceEn === record.approval.sentence,
  );
  const targetForm =
    record.approval.targetForm ??
    matchedExample?.targetForm ??
    (sentenceContainsTarget(record.approval.sentence, record.capture.text)
      ? record.capture.text
      : null);
  if (
    !targetForm ||
    !sentenceContainsTarget(record.approval.sentence, targetForm)
  ) {
    throw new MiningError(
      "APPROVAL_TARGET_MISSING",
      "A frase aprovada não identifica a expressão que deve ser destacada.",
      409,
    );
  }

  const translationsPtBr =
    record.capture.kind === "sentence"
      ? [
          matchedExample?.translationPtBr ??
            record.generation.sentenceTranslationPtBr,
        ].filter((translation): translation is string => Boolean(translation))
      : (record.generation.translationsPtBr ?? []).map(
          (translation) => translation.text,
        );
  if (translationsPtBr.length === 0) {
    throw new MiningError(
      "APPROVAL_TRANSLATION_MISSING",
      "A tradução da captura aprovada não está disponível.",
      409,
    );
  }

  return {
    approvalId: record.approval.id,
    approvedAt: record.approval.approvedAt.toISOString(),
    captureId: record.capture.id,
    remoteStatus: record.capture.status as AnkiRemoteStatus,
    sentence: record.approval.sentence,
    targetForm,
    targetText: record.capture.text,
    translationsPtBr,
  };
}

export function buildApprovedCardList(records: ApprovedCardRecord[]) {
  const cards: ApprovedCard[] = [];
  const issues: Array<{ approvalId: string; captureId: string; code: string }> =
    [];
  for (const record of records) {
    try {
      cards.push(buildApprovedCard(record));
    } catch (error) {
      if (!(error instanceof MiningError)) throw error;
      issues.push({
        approvalId: record.approval.id,
        captureId: record.capture.id,
        code: error.code,
      });
    }
  }
  return { cards, issues };
}

async function transitionCard(
  userId: string,
  captureId: string,
  approvalId: string,
  expectedStatus: "approved" | "pending_anki",
  nextStatus: "pending_anki" | "sent_to_anki",
) {
  return database.transaction(async (transaction) => {
    const [owned] = await transaction
      .select({ approvalId: approvals.id, status: captures.status })
      .from(approvals)
      .innerJoin(
        captures,
        and(eq(captures.id, approvals.captureId), eq(captures.userId, userId)),
      )
      .where(
        and(
          eq(approvals.id, approvalId),
          eq(approvals.captureId, captureId),
          eq(approvals.userId, userId),
        ),
      );
    if (!owned) {
      throw new MiningError(
        "APPROVAL_NOT_FOUND",
        "A aprovação não foi encontrada.",
        404,
      );
    }
    if (owned.status !== expectedStatus && owned.status !== nextStatus) {
      throw new MiningError(
        "ANKI_STATE_CONFLICT",
        "O card não está no estado esperado para esta sincronização.",
        409,
      );
    }

    if (owned.status === expectedStatus) {
      const updated = await transaction
        .update(captures)
        .set({ status: nextStatus, updatedAt: new Date() })
        .where(
          and(
            eq(captures.id, captureId),
            eq(captures.userId, userId),
            eq(captures.status, expectedStatus),
          ),
        )
        .returning({ status: captures.status });
      if (updated.length === 0) {
        const [current] = await transaction
          .select({ status: captures.status })
          .from(approvals)
          .innerJoin(
            captures,
            and(
              eq(captures.id, approvals.captureId),
              eq(captures.userId, userId),
            ),
          )
          .where(
            and(
              eq(approvals.id, approvalId),
              eq(approvals.captureId, captureId),
              eq(approvals.userId, userId),
            ),
          );
        if (current?.status !== nextStatus) {
          throw new MiningError(
            "ANKI_STATE_CONFLICT",
            "O card mudou enquanto a sincronização estava em andamento.",
            409,
          );
        }
      }
    }

    return { approvalId, captureId, status: nextStatus };
  });
}
