import { sentenceContainsTarget, type ApproveCaptureInput } from "@dango/domain";
import { and, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { approval, capture, generation } from "@/db/schema/mining";
import { getCapture } from "./captures";
import { MiningError } from "./errors";

export async function approveCapture(
  database: Database,
  userId: string,
  captureId: string,
  input: ApproveCaptureInput,
) {
  await database.transaction(async (transaction) => {
    const [captureRow] = await transaction
      .select()
      .from(capture)
      .where(and(eq(capture.id, captureId), eq(capture.userId, userId)));
    if (!captureRow) {
      throw new MiningError("CAPTURE_NOT_FOUND", "Captura não encontrada.", 404);
    }

    const [generationRow] = await transaction
      .select()
      .from(generation)
      .where(
        and(
          eq(generation.id, input.generationId),
          eq(generation.captureId, captureId),
          eq(generation.userId, userId),
        ),
      );
    if (!generationRow || generationRow.status !== "succeeded") {
      throw new MiningError("GENERATION_NOT_READY", "Gere as frases antes de aprovar.", 409);
    }

    // TODO: review
    // validateSelection(captureRow, generationRow, input);

    await transaction
      .insert(approval)
      .values({
        captureId,
        generationId: input.generationId,
        id: input.id,
        sentence: input.sentence,
        source: input.source,
        userId,
      })
      .onConflictDoNothing();

    const [saved] = await transaction
      .select()
      .from(approval)
      .where(and(eq(approval.captureId, captureId), eq(approval.userId, userId)));
    if (
      !saved ||
      saved.id !== input.id ||
      saved.generationId !== input.generationId ||
      saved.sentence !== input.sentence ||
      saved.source !== input.source
    ) {
      throw new MiningError("APPROVAL_CONFLICT", "Esta captura já possui outra aprovação.", 409);
    }

    await transaction
      .update(capture)
      .set({ status: "approved", updatedAt: new Date() })
      .where(and(eq(capture.id, captureId), eq(capture.userId, userId)));
  });

  return getCapture(database, userId, captureId);
}

function validateSelection(
  captureRow: typeof capture.$inferSelect,
  generationRow: typeof generation.$inferSelect,
  input: ApproveCaptureInput,
) {
  if (input.source === "generated" && !generationRow.examples?.some((example) => example.sentenceEn === input.sentence)) {
    throw new MiningError("INVALID_SELECTION", "Escolha uma das frases geradas.", 400);
  }

  if (
    input.source === "original" &&
    (captureRow.originalSentence !== input.sentence ||
      !sentenceContainsTarget(input.sentence, captureRow.text))
  ) {
    throw new MiningError("INVALID_ORIGINAL", "A frase original não contém a expressão capturada.", 400);
  }
}
