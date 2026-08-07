import { createGenerationSchema } from "@dango/domain";
import { z } from "zod";

import { database } from "@/db/runtime";
import { env } from "@/lib/environment";
import { apiPreflight, assertSecureMutation, withApiCors } from "@/modules/mining/server/api-security";
import { MiningError, miningErrorResponse, parseJsonRequest } from "@/modules/mining/server/errors";
import { generateCapture } from "@/modules/mining/server/generations";
import { generateSentenceOptions } from "@/modules/mining/server/sentence-generator";
import { requireUserId } from "@/modules/mining/server/session";

export async function POST(
  request: Request,
  context: { params: Promise<{ captureId: string }> },
) {
  try {
    assertSecureMutation(request);
    const userId = await requireUserId(request);
    const parsed = createGenerationSchema.safeParse(await parseJsonRequest(request));
    if (!parsed.success) {
      throw new MiningError("INVALID_GENERATION", "Não foi possível iniciar a geração.", 400);
    }
    const { captureId } = await context.params;
    if (!z.uuid().safeParse(captureId).success) {
      throw new MiningError("INVALID_CAPTURE_ID", "Identificador de captura inválido.", 400);
    }
    return withApiCors(
      request,
      Response.json(
        await generateCapture(database, userId, captureId, parsed.data.id, generateSentenceOptions, {
          dailyLimit: env.AI_DAILY_GENERATION_LIMIT ?? null,
          operationTimeoutMs: env.AI_GENERATION_TIMEOUT_SECONDS * 1000,
        }),
      ),
    );
  } catch (error) {
    return withApiCors(request, miningErrorResponse(error));
  }
}

export const OPTIONS = apiPreflight;
