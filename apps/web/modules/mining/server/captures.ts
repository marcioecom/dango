import type { ApprovalSource, Capture, CreateCaptureInput } from "@dango/domain";
import { and, desc, eq, inArray } from "drizzle-orm";

import type { Database } from "@/db";
import { approval, capture, generation } from "@/db/schema/mining";
import { MiningError } from "./errors";

export function normalizeCaptureText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export async function createCapture(database: Database, userId: string, input: CreateCaptureInput) {
  await database
    .insert(capture)
    .values({
      id: input.id,
      normalizedText: normalizeCaptureText(input.text),
       kind: input.kind,
       originalSentence: input.kind === "term" ? input.originalSentence ?? null : null,
      source: input.source ?? null,
      text: input.text,
      userId,
    })
    .onConflictDoNothing({ target: capture.id });

  const [saved] = await database
    .select()
    .from(capture)
    .where(and(eq(capture.id, input.id), eq(capture.userId, userId)));

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

  return getCapture(database, userId, saved.id);
}

export async function listCaptures(database: Database, userId: string): Promise<Capture[]> {
  const captures = await database
    .select()
    .from(capture)
    .where(eq(capture.userId, userId))
    .orderBy(desc(capture.updatedAt));

  if (captures.length === 0) {
    return [];
  }

  const captureIds = captures.map((item) => item.id);
  const [generations, approvals] = await Promise.all([
    database
      .select()
      .from(generation)
      .where(and(eq(generation.userId, userId), inArray(generation.captureId, captureIds)))
      .orderBy(desc(generation.createdAt)),
    database
      .select()
      .from(approval)
      .where(and(eq(approval.userId, userId), inArray(approval.captureId, captureIds))),
  ]);

  const latestGeneration = new Map<string, (typeof generations)[number]>();
  for (const item of generations) {
    if (!latestGeneration.has(item.captureId)) {
      latestGeneration.set(item.captureId, item);
    }
  }
  const approvalByCapture = new Map(approvals.map((item) => [item.captureId, item]));

  return captures.map((item) =>
    serializeCapture(
      item,
      latestGeneration.get(item.id) ?? null,
      approvalByCapture.get(item.id) ?? null,
    ),
  );
}

export async function getCapture(database: Database, userId: string, captureId: string) {
  const captures = await listCaptures(database, userId);
  const found = captures.find((item) => item.id === captureId);
  if (!found) {
    throw new MiningError("CAPTURE_NOT_FOUND", "Captura não encontrada.", 404);
  }
  return found;
}

type CaptureRow = typeof capture.$inferSelect;
type GenerationRow = typeof generation.$inferSelect;
type ApprovalRow = typeof approval.$inferSelect;

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
