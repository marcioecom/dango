import { createMiningSessionSchema } from "@dango/domain";

import { database } from "@/db/runtime";
import { requireUser } from "@/modules/auth/server/auth-utils";
import { createMiningSession } from "@/modules/mining/server/session/sessions";
import { MiningError, miningErrorResponse, parseJsonRequest } from "@/modules/mining/shared/server/errors";
import { assertJsonMutation, preflight, withCors } from "@/server/cors";

export async function POST(request: Request) {
  try {
    assertJsonMutation(request);
    const user = await requireUser(request);
    const parsed = createMiningSessionSchema.safeParse(await parseJsonRequest(request));
    if (!parsed.success) throw new MiningError("INVALID_SESSION", "Revise os itens da sessão.", 400);
    return withCors(request, Response.json(await createMiningSession(database, user.id, parsed.data), { status: 201 }));
  } catch (error) {
    return withCors(request, miningErrorResponse(error));
  }
}

export const OPTIONS = preflight;
