import { createCaptureSchema } from "@dango/domain";

import { database } from "@/db/runtime";
import { requireUser } from "@/modules/auth/server/auth-utils";
import { createCapture, listCaptures } from "@/modules/mining/server/captures";
import { MiningError, miningErrorResponse, parseJsonRequest } from "@/modules/mining/server/errors";
import { assertJsonMutation, preflight, withCors } from "@/server/cors";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return withCors(request, Response.json({ captures: await listCaptures(database, user.id) }));
  } catch (error) {
    return withCors(request, miningErrorResponse(error));
  }
}

export async function POST(request: Request) {
  try {
    assertJsonMutation(request);
    const user = await requireUser(request);
    const parsed = createCaptureSchema.safeParse(await parseJsonRequest(request));
    if (!parsed.success) {
      throw new MiningError("INVALID_CAPTURE", "Revise os dados da captura.", 400);
    }
    return withCors(
      request,
      Response.json(await createCapture(database, user.id, parsed.data), { status: 201 }),
    );
  } catch (error) {
    return withCors(request, miningErrorResponse(error));
  }
}

export const OPTIONS = preflight;
