import type { ApprovalSource, Capture, CreateCaptureInput } from "@dango/domain";
import { and, desc, eq, inArray } from "drizzle-orm";

import { database } from "@/db/runtime";
import { approvals, captures, generations } from "@/db/schema/mining";
import { MiningError } from "./errors";

export function normalizeCaptureText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export async function createCapture(userId: string, input: CreateCaptureInput) {
  await database
    .insert(captures)
    .values({
      id: input.id,
      normalizedText: normalizeCaptureText(input.text),
      kind: input.kind,
      originalSentence: input.kind === "term" ? input.originalSentence ?? null : null,
      source: input.source ?? null,
      text: input.text,
      userId,
    })
    .onConflictDoNothing({ target: captures.id });

  const [saved] = await database
    .select()
    .from(captures)
    .where(and(eq(captures.id, input.id), eq(captures.userId, userId)));

  if (!saved) {
    throw new MiningError("CAPTURE_ID_CONFLICT", "Não foi possível usar o identificador da captura.", 409);
  }

  if (
    saved.text !== input.text ||
    saved.kind !== input.kind ||
    saved.originalSentence !== (input.kind === "term" ? input.originalSentence ?? null : null) ||
    saved.source !== (input.source ?? null)
  ) {
    throw new MiningError(
      "CAPTURE_ID_REUSED",
      "Esta tentativa de captura já foi usada com outro conteúdo.",
      409,
    );
  }

  return getCapture(userId, saved.id);
}

export async function listCaptures(userId: string): Promise<Capture[]> {
  const rows = await database
    .select()
    .from(captures)
    .where(eq(captures.userId, userId))
    .orderBy(desc(captures.updatedAt));

  if (rows.length === 0) {
    return [];
  }

  const captureIds = rows.map((item) => item.id);
  const [generationRows, approvalRows] = await Promise.all([
    database
      .select()
      .from(generations)
      .where(and(eq(generations.userId, userId), inArray(generations.captureId, captureIds)))
      .orderBy(desc(generations.createdAt)),
    database
      .select()
      .from(approvals)
      .where(and(eq(approvals.userId, userId), inArray(approvals.captureId, captureIds))),
  ]);

  const latestGeneration = new Map<string, (typeof generationRows)[number]>();
  for (const item of generationRows) {
    if (!latestGeneration.has(item.captureId)) {
      latestGeneration.set(item.captureId, item);
    }
  }
  const approvalByCapture = new Map(approvalRows.map((item) => [item.captureId, item]));

  return rows.map((item) =>
    serializeCapture(
      item,
      latestGeneration.get(item.id) ?? null,
      approvalByCapture.get(item.id) ?? null,
    ),
  );
}

export async function getCapture(userId: string, captureId: string) {
  const all = await listCaptures(userId);
  const found = all.find((item) => item.id === captureId);
  if (!found) {
    throw new MiningError("CAPTURE_NOT_FOUND", "Captura não encontrada.", 404);
  }
  return found;
}

type CaptureRow = typeof captures.$inferSelect;
type GenerationRow = typeof generations.$inferSelect;
type ApprovalRow = typeof approvals.$inferSelect;

function serializeCapture(
  item: CaptureRow,
  generated: GenerationRow | null,
  approved: ApprovalRow | null,
): Capture {
  return {
    approval: approved
      ? {
          approvedAt: approved.approvedAt.toISOString(),
          generationId: approved.generationId,
          id: approved.id,
          sentence: approved.sentence,
          source: approved.source as ApprovalSource,
          targetForm: approved.targetForm,
        }
      : null,
    createdAt: item.createdAt.toISOString(),
    generation: generated
      ? {
          completedAt: generated.completedAt?.toISOString() ?? null,
          createdAt: generated.createdAt.toISOString(),
          errorCode: generated.errorCode,
          ambiguityNotePtBr: generated.ambiguityNotePtBr ?? undefined,
          id: generated.id,
          examples: generated.examples ?? [],
          explanationPtBr: generated.explanationPtBr ?? "",
          originalSentenceTranslationPtBr: generated.originalSentenceTranslationPtBr ?? undefined,
          model: generated.model,
          promptVersion: generated.promptVersion,
          status: generated.status as "running" | "succeeded" | "failed",
          translationsPtBr: generated.translationsPtBr ?? [],
          sentenceTranslationPtBr: generated.sentenceTranslationPtBr ?? undefined,
        }
      : null,
    id: item.id,
    kind: item.kind as Capture["kind"],
    originalSentence: item.originalSentence,
    source: item.source,
    status: item.status as Capture["status"],
    text: item.text,
    updatedAt: item.updatedAt.toISOString(),
  };
}
