import { approveCaptureSchema } from "@dango/domain";
import { z } from "zod";

import { approveCapture } from "@/modules/mining/server/review/approvals";
import {
  MiningError,
  parseJsonRequest,
} from "@/modules/mining/shared/server/errors";
import { withJsonAuth } from "@/server/auth";
import { preflight } from "@/server/cors";

export const POST = withJsonAuth(async (request, { params, user }) => {
  const parsed = approveCaptureSchema.safeParse(
    await parseJsonRequest(request),
  );

  if (!parsed.success) {
    throw new MiningError("INVALID_APPROVAL", "Revise a frase escolhida.", 400);
  }

  const { captureId } = await params;

  if (!z.uuid().safeParse(captureId).success) {
    throw new MiningError(
      "INVALID_CAPTURE_ID",
      "Identificador de captura inválido.",
      400,
    );
  }

  const capture = await approveCapture(user.id, captureId, parsed.data);

  return Response.json(capture);
});

export const OPTIONS = preflight;
