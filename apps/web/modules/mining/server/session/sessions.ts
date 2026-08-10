import type { MiningSession } from "@dango/domain";
import { and, asc, eq, inArray } from "drizzle-orm";

import type { Database } from "@/db";
import { captures, miningSessionItems, miningSessions } from "@/db/schema/mining";

import { MiningError } from "../../shared/server/errors";

export async function createMiningSession(
  database: Database,
  userId: string,
  input: { captureIds: string[]; id: string },
): Promise<MiningSession> {
  const existing = await database
    .select()
    .from(miningSessions)
    .where(and(eq(miningSessions.id, input.id), eq(miningSessions.userId, userId)));
  if (existing[0]) return getMiningSession(database, userId, input.id);

  const found = await database
    .select({ id: captures.id, status: captures.status })
    .from(captures)
    .where(and(eq(captures.userId, userId), inArray(captures.id, input.captureIds)));
  if (found.length !== input.captureIds.length || found.some((item) => item.status !== "ready_for_review")) {
    throw new MiningError("INVALID_SESSION_CAPTURES", "Escolha apenas itens prontos para revisão.", 400);
  }

  await database.transaction(async (transaction) => {
    await transaction.insert(miningSessions).values({ id: input.id, userId });
    await transaction.insert(miningSessionItems).values(
      input.captureIds.map((captureId, position) => ({ captureId, position, sessionId: input.id })),
    );
  });

  return getMiningSession(database, userId, input.id);
}

export async function getMiningSession(database: Database, userId: string, sessionId: string): Promise<MiningSession> {
  const [session] = await database
    .select()
    .from(miningSessions)
    .where(and(eq(miningSessions.id, sessionId), eq(miningSessions.userId, userId)));
  if (!session) throw new MiningError("SESSION_NOT_FOUND", "Sessão não encontrada.", 404);

  const items = await database
    .select({ captureId: miningSessionItems.captureId })
    .from(miningSessionItems)
    .where(eq(miningSessionItems.sessionId, sessionId))
    .orderBy(asc(miningSessionItems.position));

  return {
    captureIds: items.map((item) => item.captureId),
    createdAt: session.createdAt.toISOString(),
    id: session.id,
  };
}
