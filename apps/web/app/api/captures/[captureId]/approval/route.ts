import { approveCaptureSchema } from "@dango/domain";
import { z } from "zod";

import { database } from "@/db/runtime";
import { env } from "@/lib/environment";
import { apiPreflight, assertSecureMutation, withApiCors } from "@/modules/mining/server/api-security";
import { approveCapture } from "@/modules/mining/server/approvals";
import { MiningError, miningErrorResponse, parseJsonRequest } from "@/modules/mining/server/errors";
import { requireUserId } from "@/modules/mining/server/session";

export async function POST(
  request: Request,
  context: { params: Promise<{ captureId: string }> },
) {
  try {
    assertSecureMutation(request);
    const userId = await requireUserId(request);
    const parsed = approveCaptureSchema.safeParse(await parseJsonRequest(request));
    if (!parsed.success) {
      throw new MiningError("INVALID_APPROVAL", "Revise a frase escolhida.", 400);
    }
    assertApprovalLength(parsed.data.sentence);
    const { captureId } = await context.params;
    if (!z.uuid().safeParse(captureId).success) {
      throw new MiningError("INVALID_CAPTURE_ID", "Identificador de captura inválido.", 400);
    }
    return withApiCors(
      request,
      Response.json(await approveCapture(database, userId, captureId, parsed.data)),
    );
  } catch (error) {
    return withApiCors(request, miningErrorResponse(error));
  }
}

export const OPTIONS = apiPreflight;

function assertApprovalLength(sentence: string) {
  if (env.APPROVAL_SENTENCE_MAX_LENGTH && sentence.length > env.APPROVAL_SENTENCE_MAX_LENGTH) {
    throw new MiningError("APPROVAL_TOO_LONG", "Reduza a frase antes de aprovar.", 413);
  }
}
