import { z } from "zod";

import { database } from "@/db/runtime";
import { requireUser } from "@/modules/auth/server/auth-utils";
import { getMiningSession } from "@/modules/mining/server/session/sessions";
import { MiningError, miningErrorResponse } from "@/modules/mining/shared/server/errors";
import { preflight, withCors } from "@/server/cors";

export async function GET(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const user = await requireUser(request);
    const { sessionId } = await context.params;
    if (!z.uuid().safeParse(sessionId).success) throw new MiningError("INVALID_SESSION_ID", "Identificador de sessão inválido.", 400);
    return withCors(request, Response.json(await getMiningSession(database, user.id, sessionId)));
  } catch (error) {
    return withCors(request, miningErrorResponse(error));
  }
}

export const OPTIONS = preflight;
