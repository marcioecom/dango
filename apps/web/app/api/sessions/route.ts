import { createMiningSessionSchema } from "@dango/domain";

import { createMiningSession } from "@/modules/mining/server/session/sessions";
import {
  MiningError,
  parseJsonRequest,
} from "@/modules/mining/shared/server/errors";
import { withJsonAuth } from "@/server/auth";
import { preflight } from "@/server/cors";

export const POST = withJsonAuth(async (request, { user }) => {
  const parsed = createMiningSessionSchema.safeParse(
    await parseJsonRequest(request),
  );

  if (!parsed.success)
    throw new MiningError("INVALID_SESSION", "Revise os itens da sessão.", 400);

  const session = await createMiningSession(user.id, parsed.data);

  return Response.json(session, { status: 201 });
});

export const OPTIONS = preflight;
