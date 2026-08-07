import { createGenerationSchema } from "@dango/domain";
import { z } from "zod";

import { database } from "@/db/runtime";
import { requireUser } from "@/modules/auth/server/auth-utils";
import { MiningError, miningErrorResponse, parseJsonRequest } from "@/modules/mining/server/errors";
import { generateCapture } from "@/modules/mining/server/generations";
import { generateSentenceOptions } from "@/modules/mining/server/sentence-generator";
import { assertJsonMutation, preflight, withCors } from "@/server/cors";

export async function POST(
  request: Request,
  context: { params: Promise<{ captureId: string }> },
) {
  try {
    // TODO: same here
    assertJsonMutation(request);
    const user = await requireUser(request);
    const parsed = createGenerationSchema.safeParse(await parseJsonRequest(request));
    if (!parsed.success) {
      throw new MiningError("INVALID_GENERATION", "Não foi possível iniciar a geração.", 400);
    }
    const { captureId } = await context.params;
    if (!z.uuid().safeParse(captureId).success) {
      throw new MiningError("INVALID_CAPTURE_ID", "Identificador de captura inválido.", 400);
    }
    return withCors(
      request,
      Response.json(
        await generateCapture(database, user.id, captureId, parsed.data.id, generateSentenceOptions),
      ),
    );
  } catch (error) {
    return withCors(request, miningErrorResponse(error));
  }
}

export const OPTIONS = preflight;
