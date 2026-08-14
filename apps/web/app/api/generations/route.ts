import { z } from "zod";

import { generateCaptures } from "@/modules/mining/server/generation/generations";
import { generateSentenceOptions } from "@/modules/mining/server/generation/sentence-generator";
import {
  MiningError,
  parseJsonRequest,
} from "@/modules/mining/shared/server/errors";
import { withJsonAuth } from "@/server/auth";
import { preflight } from "@/server/cors";

const batchSchema = z.object({
  captureIds: z.array(z.uuid()).min(1),
  id: z.uuid(),
});

export const maxDuration = 300;

export const POST = withJsonAuth(async (request, { user }) => {
  const parsed = batchSchema.safeParse(await parseJsonRequest(request));
  if (!parsed.success)
    throw new MiningError(
      "INVALID_GENERATION",
      "Revise os itens para gerar.",
      400,
    );

  const captures = await generateCaptures(
    user.id,
    parsed.data.captureIds,
    parsed.data.id,
    generateSentenceOptions,
  );

  return Response.json(captures, { status: 202 });
});

export const OPTIONS = preflight;
