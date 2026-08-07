import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";

import type { Database } from "@/db";
import { capture, generation, generationUsage } from "@/db/schema/mining";

import { getCapture, listCaptures } from "./captures";
import { MiningError } from "./errors";
import {
  DEFAULT_MODEL,
  FALLBACK_MODEL,
  PROMPT_VERSION,
  type SentenceGenerator,
} from "./sentence-generator";

const generationTimeoutMs = 60_000;

export async function generateCapture(
  database: Database,
  userId: string,
  captureId: string,
  operationId: string,
  generator: SentenceGenerator,
) {
  await generateCaptures(database, userId, [captureId], operationId, generator);
  return getCapture(database, userId, captureId);
}

export async function generateCaptures(
  database: Database,
  userId: string,
  captureIds: string[],
  operationId: string,
  generator: SentenceGenerator,
) {
  const reserved = await reserve(database, userId, captureIds, operationId);
  if (!reserved) return listCaptures(database, userId);

  let lastError: unknown;
  for (const model of [DEFAULT_MODEL, FALLBACK_MODEL]) {
    try {
      const result = await generator({
        captures: reserved.captures.map((capture) => ({
          ...capture,
          kind: capture.kind as "sentence" | "term",
        })),
        model,
        timeoutMs: generationTimeoutMs,
      });
      const completedAt = new Date();
      await database.transaction(async (transaction) => {
        for (const item of reserved.generations) {
          const output = result.outputs.get(item.captureId);
          if (!output) throw new MiningError("INVALID_GENERATION", "A resposta não contém todos os itens.", 502);
          await transaction
            .update(generation)
            .set({
              ambiguityNotePtBr: output.ambiguityNotePtBr,
              completedAt,
              errorCode: null,
              examples: output.examples,
              explanationPtBr: output.explanationPtBr,
              model,
              originalSentenceTranslationPtBr: output.originalSentenceTranslationPtBr,
              sentenceTranslationPtBr: output.sentenceTranslationPtBr,
              status: "succeeded",
              translationsPtBr: output.translationsPtBr,
            })
            .where(and(eq(generation.id, item.id), eq(generation.userId, userId), eq(generation.status, "running")));
        }
        await transaction.insert(generationUsage).values({
          generationId: reserved.generations[0].id,
          inputTokens: result.usage.inputTokens,
          latencyMs: result.usage.latencyMs,
          model,
          outcome: "succeeded",
          outputTokens: result.usage.outputTokens,
          reportedCostUsd: result.usage.reportedCostUsd,
          userId,
        });
        await transaction
          .update(capture)
          .set({ status: "ready_for_review", updatedAt: completedAt })
          .where(and(eq(capture.userId, userId), inArray(capture.id, captureIds)));
      });
      return listCaptures(database, userId);
    } catch (error) {
      lastError = error;
      console.error("[generation-batch] model attempt failed", {
        error: error instanceof Error ? error.message : "UnknownError",
        model,
        operationId,
      });
    }
  }

  await database.transaction(async (transaction) => {
    await transaction
      .update(generation)
      .set({ completedAt: new Date(), errorCode: "PROVIDER_FAILURE", status: "failed" })
      .where(and(eq(generation.userId, userId), inArray(generation.id, reserved.generations.map((item) => item.id))));
    await transaction
      .update(capture)
      .set({ status: "inbox", updatedAt: new Date() })
      .where(and(eq(capture.userId, userId), inArray(capture.id, captureIds)));
  });
  console.error("Batch generation failed", { error: lastError instanceof Error ? lastError.name : "UnknownError" });
  throw new MiningError("GENERATION_FAILED", "A geração falhou. Suas capturas continuam na fila.", 502);
}

async function reserve(database: Database, userId: string, captureIds: string[], operationId: string) {
  const existing = await database
    .select({ captureId: generation.captureId, status: generation.status })
    .from(generation)
    .where(and(eq(generation.userId, userId), eq(generation.id, operationId)));
  if (existing[0]) {
    if (existing[0].status === "succeeded") return null;
    throw new MiningError("GENERATION_RUNNING", "A geração já está em andamento.", 409);
  }

  return database.transaction(async (transaction) => {
    const captures = await transaction
      .select()
      .from(capture)
      .where(and(eq(capture.userId, userId), inArray(capture.id, captureIds)));
    if (captures.length !== captureIds.length || captures.some((item) => item.status === "approved" || item.status === "generating")) {
      throw new MiningError("INVALID_GENERATION_CAPTURES", "Escolha capturas que possam ser geradas.", 409);
    }
    const generations = captures.map((item, index) => ({ captureId: item.id, id: index === 0 ? operationId : randomUUID() }));
    await transaction.insert(generation).values(
      generations.map((item) => ({
        captureId: item.captureId,
        id: item.id,
        leaseExpiresAt: new Date(Date.now() + generationTimeoutMs),
        model: DEFAULT_MODEL,
        promptVersion: PROMPT_VERSION,
        userId,
      })),
    );
    await transaction
      .update(capture)
      .set({ status: "generating", updatedAt: new Date() })
      .where(and(eq(capture.userId, userId), inArray(capture.id, captureIds)));
    return { captures, generations };
  });
}
