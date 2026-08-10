import { captureDecisionSchema } from "@dango/domain";
import { z } from "zod";

import { database } from "@/db/runtime";
import { requireUser } from "@/modules/auth/server/auth-utils";
import { decideCapture } from "@/modules/mining/server/review/decisions";
import { MiningError, miningErrorResponse, parseJsonRequest } from "@/modules/mining/shared/server/errors";
import { assertJsonMutation, preflight, withCors } from "@/server/cors";

export async function POST(request: Request, context: { params: Promise<{ captureId: string }> }) {
  try {
    assertJsonMutation(request);
    const user = await requireUser(request);
    const parsed = captureDecisionSchema.safeParse(await parseJsonRequest(request));
    if (!parsed.success) throw new MiningError("INVALID_DECISION", "Escolha uma decisão válida.", 400);
    const { captureId } = await context.params;
    if (!z.uuid().safeParse(captureId).success) throw new MiningError("INVALID_CAPTURE_ID", "Identificador de captura inválido.", 400);
    return withCors(request, Response.json(await decideCapture(database, user.id, captureId, parsed.data.action)));
  } catch (error) {
    return withCors(request, miningErrorResponse(error));
  }
}

export const OPTIONS = preflight;
