import { createCaptureSchema } from "@dango/domain";

import {
  createCapture,
  listCaptures,
} from "@/modules/mining/shared/server/captures";
import {
  MiningError,
  parseJsonRequest,
} from "@/modules/mining/shared/server/errors";
import { withAuth, withJsonAuth } from "@/server/auth";
import { preflight } from "@/server/cors";

export const GET = withAuth(async (_request, { user }) => {
  const captures = await listCaptures(user.id);
  return Response.json({ captures });
});

export const POST = withJsonAuth(async (request, { user }) => {
  const parsed = createCaptureSchema.safeParse(await parseJsonRequest(request));
  if (!parsed.success) {
    throw new MiningError(
      "INVALID_CAPTURE",
      "Revise os dados da captura.",
      400,
    );
  }

  const capture = await createCapture(user.id, parsed.data);

  return Response.json(capture, { status: 201 });
});

export const OPTIONS = preflight;
