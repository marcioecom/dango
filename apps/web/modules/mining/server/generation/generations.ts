import { randomUUID } from "node:crypto";

import type { Capture } from "@dango/domain";
import { and, eq, inArray } from "drizzle-orm";
import { after } from "next/server";

import { database } from "@/db/runtime";
import { captures, generations, generationUsages } from "@/db/schema/mining";

import { getCapture, listCaptures } from "@/modules/mining/shared/server/captures";
import { MiningError } from "@/modules/mining/shared/server/errors";
import { InvalidGenerationOutputError } from "./generation-errors";
import { PROMPT_VERSION } from "./generation-prompt";
import { DEFAULT_MODEL, type SentenceGenerator } from "./sentence-generator";

const generationConcurrency = 4;
const generationTimeoutMs = 60_000;

type ReservedGeneration = { captureId: string; id: string };

type ReservedBatch = {
  captures: Array<{
    id: string;
    kind: string;
    originalSentence: string | null;
    source: string | null;
    text: string;
  }>;
  generations: ReservedGeneration[];
};

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

  after(() => runGeneration(userId, reserved, generator));
  return listCaptures(userId);
}

export async function runGeneration(
  userId: string,
  reserved: ReservedBatch,
  generator: SentenceGenerator,
) {
  const generationIdByCapture = new Map(
    reserved.generations.map((item) => [item.captureId, item.id]),
  );
  await runWithConcurrency(
    reserved.captures,
    generationConcurrency,
    async (capture) => {
      const generationId = generationIdByCapture.get(capture.id);
      if (!generationId) return;
      try {
        const result = await generator({
          captures: [
            { ...capture, kind: capture.kind as Capture["kind"] },
          ],
          timeoutMs: generationTimeoutMs,
        });
        const output = result.outputs.get(capture.id);
        if (!output) {
          throw new InvalidGenerationOutputError(
            "A resposta não contém todos os itens.",
          );
        }
        const completedAt = new Date();
        await database.transaction(async (transaction) => {
          await transaction
            .update(generations)
            .set({
              ambiguityNotePtBr: output.ambiguityNotePtBr,
              completedAt,
              errorCode: null,
              examples: output.examples,
              explanationPtBr: output.explanationPtBr,
              model: result.model,
              originalSentenceTranslationPtBr:
                output.originalSentenceTranslationPtBr,
              sentenceTranslationPtBr: output.sentenceTranslationPtBr,
              status: "succeeded",
              translationsPtBr: output.translationsPtBr,
            })
            .where(
              and(
                eq(generations.id, generationId),
                eq(generations.userId, userId),
                eq(generations.status, "running"),
              ),
            );
          await transaction.insert(generationUsages).values({
            generationId,
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
            .where(and(eq(captures.userId, userId), eq(captures.id, capture.id)));
        });
      } catch (error) {
        const errorCode =
          error instanceof InvalidGenerationOutputError
            ? error.code
            : "PROVIDER_FAILURE";
        await database.transaction(async (transaction) => {
          await transaction
            .update(generations)
            .set({
              completedAt: new Date(),
              errorCode,
              status: "failed",
            })
            .where(
              and(
                eq(generations.id, generationId),
                eq(generations.userId, userId),
              ),
            );
          await transaction
            .update(captures)
            .set({ status: "inbox", updatedAt: new Date() })
            .where(and(eq(captures.userId, userId), eq(captures.id, capture.id)));
        });
        console.error("[generation] capture generation failed", {
          captureId: capture.id,
          error: error instanceof Error ? error.message : "UnknownError",
          errorCode,
        });
      }
    },
  );
}

export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  const queue = [...items];
  const lanes = Array.from(
    { length: Math.min(concurrency, queue.length) },
    async () => {
      let item: T | undefined;
      while ((item = queue.shift()) !== undefined) {
        await worker(item);
      }
    },
  );
  await Promise.all(lanes);
}

async function reserve(userId: string, captureIds: string[], operationId: string): Promise<ReservedBatch | null> {
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
