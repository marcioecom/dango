import type { MiningSession } from "@dango/domain";
import { and, asc, eq, inArray } from "drizzle-orm";

import type { Database } from "@/db";
import { capture, miningSession, miningSessionItem } from "@/db/schema/mining";

import { MiningError } from "./errors";

export async function createMiningSession(
  database: Database,
  userId: string,
  input: { captureIds: string[]; id: string },
): Promise<MiningSession> {
  const existing = await database
    .select()
    .from(miningSession)
    .where(and(eq(miningSession.id, input.id), eq(miningSession.userId, userId)));
  if (existing[0]) return getMiningSession(database, userId, input.id);

  const captures = await database
    .select({ id: capture.id, status: capture.status })
    .from(capture)
    .where(and(eq(capture.userId, userId), inArray(capture.id, input.captureIds)));
  if (captures.length !== input.captureIds.length || captures.some((item) => item.status !== "ready_for_review")) {
    throw new MiningError("INVALID_SESSION_CAPTURES", "Escolha apenas itens prontos para revisão.", 400);
  }

  await database.transaction(async (transaction) => {
    await transaction.insert(miningSession).values({ id: input.id, userId });
    await transaction.insert(miningSessionItem).values(
      input.captureIds.map((captureId, position) => ({ captureId, position, sessionId: input.id })),
    );
  });

  return getMiningSession(database, userId, input.id);
}

export async function getMiningSession(database: Database, userId: string, sessionId: string): Promise<MiningSession> {
  const [session] = await database
    .select()
    .from(miningSession)
    .where(and(eq(miningSession.id, sessionId), eq(miningSession.userId, userId)));
  if (!session) throw new MiningError("SESSION_NOT_FOUND", "Sessão não encontrada.", 404);

  const items = await database
    .select({ captureId: miningSessionItem.captureId })
    .from(miningSessionItem)
    .where(eq(miningSessionItem.sessionId, sessionId))
    .orderBy(asc(miningSessionItem.position));

  return {
    captureIds: items.map((item) => item.captureId),
    completedAt: session.completedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    id: session.id,
  };
}
