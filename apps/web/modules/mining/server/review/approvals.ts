import { sentenceContainsTarget, type ApproveCaptureInput } from "@dango/domain";
import { and, eq } from "drizzle-orm";

import { database } from "@/db/runtime";
import { approvals, captures, generations } from "@/db/schema/mining";
import { getCapture } from "@/modules/mining/shared/server/captures";
import { MiningError } from "@/modules/mining/shared/server/errors";

export async function approveCapture(
  userId: string,
  captureId: string,
  input: ApproveCaptureInput,
) {
  await database.transaction(async (transaction) => {
    const [captureRow] = await transaction
      .select()
      .from(captures)
      .where(and(eq(captures.id, captureId), eq(captures.userId, userId)));
    if (!captureRow) {
      throw new MiningError("CAPTURE_NOT_FOUND", "Captura não encontrada.", 404);
    }

    const [existingApproval] = await transaction
      .select()
      .from(approvals)
      .where(and(eq(approvals.captureId, captureId), eq(approvals.userId, userId)));
    if (existingApproval) {
      if (
        ["approved", "pending_anki", "sent_to_anki"].includes(captureRow.status) &&
        isSameApproval(existingApproval, input)
      ) {
        return;
      }
      throw new MiningError("APPROVAL_CONFLICT", "Esta captura já possui outra aprovação.", 409);
    }
    if (captureRow.status !== "ready_for_review") {
      throw new MiningError("CAPTURE_NOT_READY", "Escolha uma captura pronta para revisão.", 409);
    }

    const [generationRow] = await transaction
      .select()
      .from(generations)
      .where(
        and(
          eq(generations.id, input.generationId),
          eq(generations.captureId, captureId),
          eq(generations.userId, userId),
        ),
      );
    if (!generationRow || generationRow.status !== "succeeded") {
      throw new MiningError("GENERATION_NOT_READY", "Gere as frases antes de aprovar.", 409);
    }

    validateSelection(captureRow, generationRow, input);

    await transaction
      .insert(approvals)
      .values({
        captureId,
        generationId: input.generationId,
        id: input.id,
        sentence: input.sentence,
        source: input.source,
        targetForm: input.targetForm,
        userId,
      })
      .onConflictDoNothing();

    const [saved] = await transaction
      .select()
      .from(approvals)
      .where(and(eq(approvals.captureId, captureId), eq(approvals.userId, userId)));
    if (!saved || !isSameApproval(saved, input)) {
      throw new MiningError("APPROVAL_CONFLICT", "Esta captura já possui outra aprovação.", 409);
    }

    await transaction
      .update(captures)
      .set({ status: "approved", updatedAt: new Date() })
      .where(and(eq(captures.id, captureId), eq(captures.userId, userId)));
  });

  return getCapture(userId, captureId);
}

function isSameApproval(saved: typeof approvals.$inferSelect, input: ApproveCaptureInput) {
  return (
    saved.id === input.id &&
    saved.generationId === input.generationId &&
    saved.sentence === input.sentence &&
    saved.source === input.source &&
    saved.targetForm === input.targetForm
  );
}

function validateSelection(
  captureRow: typeof captures.$inferSelect,
  generationRow: typeof generations.$inferSelect,
  input: ApproveCaptureInput,
) {
  const knownTargetForms = new Set([
    captureRow.text,
    ...(generationRow.examples ?? []).map((example) => example.targetForm),
  ]);
  if (!knownTargetForms.has(input.targetForm)) {
    throw new MiningError(
      "INVALID_TARGET_FORM",
      "Escolha a forma da expressão usada na opção original.",
      400,
    );
  }
  if (!sentenceContainsTarget(input.sentence, input.targetForm)) {
    throw new MiningError("INVALID_TARGET_FORM", "A frase final deve conter a expressão escolhida.", 400);
  }

  if (
    input.source === "generated" &&
    !generationRow.examples?.some(
      (example) => example.sentenceEn === input.sentence && example.targetForm === input.targetForm,
    )
  ) {
    throw new MiningError("INVALID_SELECTION", "Escolha uma das frases geradas.", 400);
  }

  const originalSentence = captureRow.kind === "sentence" ? captureRow.text : captureRow.originalSentence;
  if (
    input.source === "original" &&
    (originalSentence !== input.sentence ||
      input.targetForm !== captureRow.text ||
      !sentenceContainsTarget(input.sentence, captureRow.text))
  ) {
    throw new MiningError("INVALID_ORIGINAL", "A frase original não contém a expressão capturada.", 400);
  }
}
