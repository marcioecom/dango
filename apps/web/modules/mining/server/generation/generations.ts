import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";

import { database } from "@/db/runtime";
import { captures, generations, generationUsages } from "@/db/schema/mining";

import { getCapture, listCaptures } from "@/modules/mining/shared/server/captures";
import { MiningError } from "@/modules/mining/shared/server/errors";
import { InvalidGenerationOutputError } from "./generation-errors";
import { PROMPT_VERSION } from "./generation-prompt";
import {
  DEFAULT_MODEL,
  type SentenceGenerator,
} from "./sentence-generator";

const generationTimeoutMs = 60_000;

export async function generateCapture(
  userId: string,
  captureId: string,
  operationId: string,
  generator: SentenceGenerator,
) {
  await generateCaptures(userId, [captureId], operationId, generator);
  return getCapture(userId, captureId);
}

export async function generateCaptures(
  userId: string,
  captureIds: string[],
  operationId: string,
  generator: SentenceGenerator,
) {
  const reserved = await reserve(userId, captureIds, operationId);
  if (!reserved) return listCaptures(userId);

  try {
    const result = await generator({
      captures: reserved.captures.map((capture) => ({
        ...capture,
        kind: capture.kind as "sentence" | "term",
      })),
      timeoutMs: generationTimeoutMs,
    });
    const completedAt = new Date();
    await database.transaction(async (transaction) => {
      for (const item of reserved.generations) {
        const output = result.outputs.get(item.captureId);
        if (!output) throw new MiningError("INVALID_GENERATION", "A resposta não contém todos os itens.", 502);
        await transaction
          .update(generations)
          .set({
            ambiguityNotePtBr: output.ambiguityNotePtBr,
            completedAt,
            errorCode: null,
            examples: output.examples,
            explanationPtBr: output.explanationPtBr,
            model: result.model,
            originalSentenceTranslationPtBr: output.originalSentenceTranslationPtBr,
            sentenceTranslationPtBr: output.sentenceTranslationPtBr,
            status: "succeeded",
            translationsPtBr: output.translationsPtBr,
          })
          .where(and(eq(generations.id, item.id), eq(generations.userId, userId), eq(generations.status, "running")));
      }
      await transaction.insert(generationUsages).values({
        generationId: reserved.generations[0].id,
        inputTokens: result.usage.inputTokens,
        latencyMs: result.usage.latencyMs,
        model: result.model,
        outcome: "succeeded",
        outputTokens: result.usage.outputTokens,
        reportedCostUsd: result.usage.reportedCostUsd,
        userId,
      });
      await transaction
        .update(captures)
        .set({ status: "ready_for_review", updatedAt: completedAt })
        .where(and(eq(captures.userId, userId), inArray(captures.id, captureIds)));
    });
    return listCaptures(userId);
  } catch (error) {
    const errorCode =
      error instanceof InvalidGenerationOutputError
        ? error.code
        : "PROVIDER_FAILURE";
    await database.transaction(async (transaction) => {
      await transaction
        .update(generations)
        .set({ completedAt: new Date(), errorCode, status: "failed" })
        .where(and(eq(generations.userId, userId), inArray(generations.id, reserved.generations.map((item) => item.id))));
      await transaction
        .update(captures)
        .set({ status: "inbox", updatedAt: new Date() })
        .where(and(eq(captures.userId, userId), inArray(captures.id, captureIds)));
    });
    console.error("[generation-batch] generation failed", {
      error: error instanceof Error ? error.message : "UnknownError",
      errorCode,
      operationId,
    });
    throw new MiningError("GENERATION_FAILED", "A geração falhou. Suas capturas continuam na fila.", 502);
  }
}

async function reserve(userId: string, captureIds: string[], operationId: string) {
  const [existing] = await database
    .select({ captureId: generations.captureId, status: generations.status })
    .from(generations)
    .where(and(eq(generations.userId, userId), eq(generations.id, operationId)));
  if (existing) {
    if (existing.status === "succeeded") return null;
    throw new MiningError("GENERATION_RUNNING", "A geração já está em andamento.", 409);
  }

  return database.transaction(async (transaction) => {
    const found = await transaction
      .select()
      .from(captures)
      .where(and(eq(captures.userId, userId), inArray(captures.id, captureIds)));
    if (found.length !== captureIds.length || found.some((item) => item.status !== "inbox")) {
      throw new MiningError("INVALID_GENERATION_CAPTURES", "Escolha capturas que possam ser geradas.", 409);
    }
    const reserved = found.map((item, index) => ({ captureId: item.id, id: index === 0 ? operationId : randomUUID() }));
    await transaction.insert(generations).values(
      reserved.map((item) => ({
        captureId: item.captureId,
        id: item.id,
        model: DEFAULT_MODEL,
        promptVersion: PROMPT_VERSION,
        userId,
      })),
    );
    await transaction
      .update(captures)
      .set({ status: "generating", updatedAt: new Date() })
      .where(and(eq(captures.userId, userId), inArray(captures.id, captureIds)));
    return { captures: found, generations: reserved };
  });
}
