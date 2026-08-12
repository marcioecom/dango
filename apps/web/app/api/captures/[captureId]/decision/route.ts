import { captureDecisionSchema } from "@dango/domain";
import { z } from "zod";

import { decideCapture } from "@/modules/mining/server/review/decisions";
import {
  MiningError,
  parseJsonRequest,
} from "@/modules/mining/shared/server/errors";
import { withJsonAuth } from "@/server/auth";
import { preflight } from "@/server/cors";

export const POST = withJsonAuth(async (request, { params, user }) => {
  const parsed = captureDecisionSchema.safeParse(
    await parseJsonRequest(request),
  );

  if (!parsed.success)
    throw new MiningError(
      "INVALID_DECISION",
      "Escolha uma decisão válida.",
      400,
    );

  const { captureId } = await params;

  if (!z.uuid().safeParse(captureId).success) {
    throw new MiningError(
      "INVALID_CAPTURE_ID",
      "Identificador de captura inválido.",
      400,
    );
  }

  const capture = await decideCapture(user.id, captureId, parsed.data.action);

  return Response.json(capture);
});

export const OPTIONS = preflight;
