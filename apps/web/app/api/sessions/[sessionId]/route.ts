import { z } from "zod";

import { database } from "@/db/runtime";
import { requireUser } from "@/modules/auth/server/auth-utils";
import { MiningError, miningErrorResponse } from "@/modules/mining/server/errors";
import { getMiningSession } from "@/modules/mining/server/sessions";
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
