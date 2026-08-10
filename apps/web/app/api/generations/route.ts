import { z } from "zod";

import { database } from "@/db/runtime";
import { requireUser } from "@/modules/auth/server/auth-utils";
import { generateCaptures } from "@/modules/mining/server/generation/generations";
import { generateSentenceOptions } from "@/modules/mining/server/generation/sentence-generator";
import { MiningError, miningErrorResponse, parseJsonRequest } from "@/modules/mining/shared/server/errors";
import { assertJsonMutation, preflight, withCors } from "@/server/cors";

const batchSchema = z.object({ captureIds: z.array(z.uuid()).min(1), id: z.uuid() });

export async function POST(request: Request) {
  try {
    assertJsonMutation(request);
    const user = await requireUser(request);
    const parsed = batchSchema.safeParse(await parseJsonRequest(request));
    if (!parsed.success) throw new MiningError("INVALID_GENERATION", "Revise os itens para gerar.", 400);
    return withCors(
      request,
      Response.json(
        await generateCaptures(database, user.id, parsed.data.captureIds, parsed.data.id, generateSentenceOptions),
      ),
    );
  } catch (error) {
    return withCors(request, miningErrorResponse(error));
  }
}

export const OPTIONS = preflight;
