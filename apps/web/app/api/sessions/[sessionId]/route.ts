import { z } from "zod";

import { getMiningSession } from "@/modules/mining/server/session/sessions";
import { MiningError } from "@/modules/mining/shared/server/errors";
import { withAuth } from "@/server/auth";
import { preflight } from "@/server/cors";

export const GET = withAuth(async (_request, { params, user }) => {
  const { sessionId } = await params;
  if (!z.uuid().safeParse(sessionId).success)
    throw new MiningError(
      "INVALID_SESSION_ID",
      "Identificador de sessão inválido.",
      400,
    );

  const session = await getMiningSession(user.id, sessionId);

  return Response.json(session);
});

export const OPTIONS = preflight;
