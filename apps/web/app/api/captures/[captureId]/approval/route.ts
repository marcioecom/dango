import { approveCaptureSchema } from "@dango/domain";
import { z } from "zod";

import { database } from "@/db/runtime";
import { requireUser } from "@/modules/auth/server/auth-utils";
import { approveCapture } from "@/modules/mining/server/review/approvals";
import { MiningError, miningErrorResponse, parseJsonRequest } from "@/modules/mining/shared/server/errors";
import { assertJsonMutation, preflight, withCors } from "@/server/cors";

export async function POST(
  request: Request,
  context: { params: Promise<{ captureId: string }> },
) {
  try {
    // TODO: review how to simplify this route and make code more cleaner
    assertJsonMutation(request);
    const user = await requireUser(request);
    const parsed = approveCaptureSchema.safeParse(await parseJsonRequest(request));
    if (!parsed.success) {
      throw new MiningError("INVALID_APPROVAL", "Revise a frase escolhida.", 400);
    }
    const { captureId } = await context.params;
    if (!z.uuid().safeParse(captureId).success) {
      throw new MiningError("INVALID_CAPTURE_ID", "Identificador de captura inválido.", 400);
    }
    return withCors(
      request,
      Response.json(await approveCapture(database, user.id, captureId, parsed.data)),
    );
  } catch (error) {
    return withCors(request, miningErrorResponse(error));
  }
}

export const OPTIONS = preflight;
