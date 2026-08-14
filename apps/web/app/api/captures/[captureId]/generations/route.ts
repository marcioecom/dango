import { createGenerationSchema } from "@dango/domain";
import { z } from "zod";

import { generateCapture } from "@/modules/mining/server/generation/generations";
import { generateSentenceOptions } from "@/modules/mining/server/generation/sentence-generator";
import {
  MiningError,
  parseJsonRequest,
} from "@/modules/mining/shared/server/errors";
import { withJsonAuth } from "@/server/auth";
import { preflight } from "@/server/cors";

export const maxDuration = 300;

export const POST = withJsonAuth(async (request, { params, user }) => {
  const parsed = createGenerationSchema.safeParse(
    await parseJsonRequest(request),
  );

  if (!parsed.success) {
    throw new MiningError(
      "INVALID_GENERATION",
      "Não foi possível iniciar a geração.",
      400,
    );
  }

  const { captureId } = await params;

  if (!z.uuid().safeParse(captureId).success) {
    throw new MiningError(
      "INVALID_CAPTURE_ID",
      "Identificador de captura inválido.",
      400,
    );
  }

  const capture = await generateCapture(
    user.id,
    captureId,
    parsed.data.id,
    generateSentenceOptions,
  );

  return Response.json(capture, { status: 202 });
});

export const OPTIONS = preflight;
