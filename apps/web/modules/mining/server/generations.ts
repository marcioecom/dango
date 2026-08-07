import type { Database } from "@/db";
import { capture, generation, generationUsage } from "@/db/schema/mining";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";

import { getCapture } from "./captures";
import { MiningError } from "./errors";
import {
  DEFAULT_MODEL,
  FALLBACK_MODEL,
  PROMPT_VERSION,
  type SentenceGenerator,
} from "./sentence-generator";

type GenerationSettings = {
  dailyLimit: number | null;
  defaultModel?: string;
  fallbackModel?: string;
  operationTimeoutMs: number;
};

export async function generateCapture(
  database: Database,
  userId: string,
  captureId: string,
  generationId: string,
  generator: SentenceGenerator,
  settings: GenerationSettings,
) {
  const defaultModel = settings.defaultModel ?? DEFAULT_MODEL;
  const fallbackModel = settings.fallbackModel ?? FALLBACK_MODEL;
  const existing = await database
    .select()
    .from(generation)
    .where(and(eq(generation.id, generationId), eq(generation.userId, userId)));

  if (existing[0]) {
    if (existing[0].captureId !== captureId) {
      throw new MiningError("GENERATION_ID_REUSED", "Esta tentativa já pertence a outra captura.", 409);
    }
    if (existing[0].status === "succeeded") {
      return getCapture(database, userId, captureId);
    }
    if (existing[0].status === "failed") {
      throw new MiningError(
        "GENERATION_FAILED",
        "Esta tentativa falhou. Inicie uma nova geração.",
        502,
      );
    }
    if (existing[0].leaseExpiresAt <= new Date()) {
      const expired = await expireGenerationAttempt(
        database,
        userId,
        existing[0].captureId,
        existing[0].id,
      );
      if (!expired) {
        throw new MiningError("GENERATION_RUNNING", "Esta geração ainda está em andamento.", 409);
      }
      throw new MiningError(
        "GENERATION_EXPIRED",
        "A geração anterior foi interrompida. Inicie uma nova tentativa.",
        409,
      );
    }
    throw new MiningError("GENERATION_RUNNING", "Esta geração ainda está em andamento.", 409);
  }

  const captureRow = await reserveGeneration(
    database,
    userId,
    captureId,
    generationId,
    defaultModel,
    settings.dailyLimit,
    settings.operationTimeoutMs,
  );

  let lastError: unknown;
  for (const model of [defaultModel, fallbackModel]) {
    const startedAt = performance.now();
    const lease = await database
      .update(generation)
      .set({ leaseExpiresAt: new Date(Date.now() + settings.operationTimeoutMs) })
      .where(
        and(
          eq(generation.id, generationId),
          eq(generation.userId, userId),
          eq(generation.status, "running"),
        ),
      )
      .returning({ id: generation.id });
    if (lease.length === 0) {
      throw new MiningError(
        "GENERATION_EXPIRED",
        "A geração perdeu a reserva. Inicie uma nova tentativa.",
        409,
      );
    }

    let result: Awaited<ReturnType<SentenceGenerator>>;
    try {
      result = await generator({
        model,
        originalSentence: captureRow.originalSentence,
        source: captureRow.source,
        text: captureRow.text,
        timeoutMs: settings.operationTimeoutMs,
      });
    } catch (error) {
      lastError = error;
      await database.insert(generationUsage).values({
        generationId,
        latencyMs: Math.round(performance.now() - startedAt),
        model,
        outcome: "failed",
        userId,
      });
      continue;
    }

    const completedAt = new Date();
    await database.transaction(async (transaction) => {
      const claimed = await transaction
        .update(generation)
        .set({
          completedAt,
          errorCode: null,
          explanation: result.output.explanation,
          model,
          sentences: result.output.sentences,
          status: "succeeded",
          translation: result.output.translation,
        })
        .where(
          and(
            eq(generation.id, generationId),
            eq(generation.userId, userId),
            eq(generation.status, "running"),
          ),
        )
        .returning({ id: generation.id });
      if (claimed.length === 0) {
        throw new MiningError(
          "GENERATION_EXPIRED",
          "A geração expirou antes de ser salva. Inicie uma nova tentativa.",
          409,
        );
      }
      await transaction.insert(generationUsage).values({
        generationId,
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
        .where(and(eq(capture.id, captureId), eq(capture.userId, userId)));
    });
    return getCapture(database, userId, captureId);
  }

  await database.transaction(async (transaction) => {
    const failed = await transaction
      .update(generation)
      .set({ completedAt: new Date(), errorCode: "PROVIDER_FAILURE", status: "failed" })
      .where(
        and(
          eq(generation.id, generationId),
          eq(generation.userId, userId),
          eq(generation.status, "running"),
        ),
      )
      .returning({ id: generation.id });
    if (failed.length > 0) {
      const [latest] = await transaction
        .select({ id: generation.id })
        .from(generation)
        .where(and(eq(generation.captureId, captureId), eq(generation.userId, userId)))
        .orderBy(desc(generation.createdAt));
      if (latest?.id === generationId) {
        await transaction
          .update(capture)
          .set({ status: "inbox", updatedAt: new Date() })
          .where(and(eq(capture.id, captureId), eq(capture.userId, userId)));
      }
    }
  });

  console.error("Falha nos modelos de geração", {
    error: lastError instanceof Error ? lastError.name : "UnknownError",
    generationId,
    models: [defaultModel, fallbackModel],
  });
  throw new MiningError(
    "GENERATION_FAILED",
    "A geração falhou nos dois modelos. Sua captura continua na fila.",
    502,
  );
}

async function expireGenerationAttempt(
  database: Database,
  userId: string,
  captureId: string,
  generationId: string,
) {
  return database.transaction(async (transaction) => {
    const observedAt = new Date();
    const expired = await transaction
      .update(generation)
      .set({ completedAt: new Date(), errorCode: "INTERRUPTED", status: "failed" })
      .where(
        and(
          eq(generation.id, generationId),
          eq(generation.userId, userId),
          eq(generation.status, "running"),
          lte(generation.leaseExpiresAt, observedAt),
        ),
      )
      .returning({ id: generation.id });
    if (expired.length === 0) {
      return false;
    }
    const [latest] = await transaction
      .select({ id: generation.id })
      .from(generation)
      .where(and(eq(generation.captureId, captureId), eq(generation.userId, userId)))
      .orderBy(desc(generation.createdAt));
    if (latest?.id === generationId) {
      await transaction
        .update(capture)
        .set({ status: "inbox", updatedAt: new Date() })
        .where(and(eq(capture.id, captureId), eq(capture.userId, userId)));
    }
    return true;
  });
}

async function reserveGeneration(
  database: Database,
  userId: string,
  captureId: string,
  generationId: string,
  model: string,
  dailyLimit: number | null,
  operationTimeoutMs: number,
) {
  return database.transaction(async (transaction) => {
    const day = new Date().toISOString().slice(0, 10);
    await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${`${userId}:${day}`}))`);

    const [captureRow] = await transaction
      .select()
      .from(capture)
      .where(and(eq(capture.id, captureId), eq(capture.userId, userId)));
    if (!captureRow) {
      throw new MiningError("CAPTURE_NOT_FOUND", "Captura não encontrada.", 404);
    }
    if (captureRow.status === "approved") {
      throw new MiningError("CAPTURE_APPROVED", "Esta captura já foi aprovada.", 409);
    }
    if (captureRow.status === "ready_for_review") {
      throw new MiningError("GENERATION_READY", "Esta captura já possui frases para revisar.", 409);
    }
    if (captureRow.status === "generating") {
      const observedAt = new Date();
      const [running] = await transaction
        .select()
        .from(generation)
        .where(
          and(
            eq(generation.captureId, captureId),
            eq(generation.userId, userId),
            eq(generation.status, "running"),
          ),
        )
        .orderBy(desc(generation.createdAt));
      if (running && running.leaseExpiresAt > observedAt) {
        throw new MiningError("GENERATION_RUNNING", "Já existe uma geração em andamento.", 409);
      }
      if (running) {
        const expired = await transaction
          .update(generation)
          .set({ completedAt: new Date(), errorCode: "INTERRUPTED", status: "failed" })
          .where(
            and(
              eq(generation.id, running.id),
              eq(generation.userId, userId),
              eq(generation.status, "running"),
              lte(generation.leaseExpiresAt, observedAt),
            ),
          )
          .returning({ id: generation.id });
        if (expired.length === 0) {
          throw new MiningError("GENERATION_RUNNING", "Já existe uma geração em andamento.", 409);
        }
      }
    }

    if (dailyLimit !== null) {
      const startOfDay = new Date(`${day}T00:00:00.000Z`);
      const [usage] = await transaction
        .select({ value: count() })
        .from(generation)
        .where(and(eq(generation.userId, userId), gte(generation.createdAt, startOfDay)));
      if (usage.value >= dailyLimit) {
        throw new MiningError(
          "GENERATION_LIMIT_REACHED",
          "Seu limite de gerações foi atingido. Tente novamente amanhã.",
          429,
        );
      }
    }

    await transaction.insert(generation).values({
      captureId,
      id: generationId,
      leaseExpiresAt: new Date(Date.now() + operationTimeoutMs),
      model,
      promptVersion: PROMPT_VERSION,
      userId,
    });
    await transaction
      .update(capture)
      .set({ status: "generating", updatedAt: new Date() })
      .where(and(eq(capture.id, captureId), eq(capture.userId, userId)));
    return captureRow;
  });
}
