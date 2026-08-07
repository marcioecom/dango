import { createCaptureSchema } from "@dango/domain";

import { database } from "@/db/runtime";
import { env } from "@/lib/environment";
import { createCapture, listCaptures } from "@/modules/mining/server/captures";
import { apiPreflight, assertSecureMutation, withApiCors } from "@/modules/mining/server/api-security";
import { MiningError, miningErrorResponse, parseJsonRequest } from "@/modules/mining/server/errors";
import { requireUserId } from "@/modules/mining/server/session";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    return withApiCors(request, Response.json({ captures: await listCaptures(database, userId) }));
  } catch (error) {
    return withApiCors(request, miningErrorResponse(error));
  }
}

export async function POST(request: Request) {
  try {
    assertSecureMutation(request);
    const userId = await requireUserId(request);
    const parsed = createCaptureSchema.safeParse(await parseJsonRequest(request));
    if (!parsed.success) {
      throw new MiningError("INVALID_CAPTURE", "Revise os dados da captura.", 400);
    }
    assertCaptureLengths(parsed.data);
    return withApiCors(
      request,
      Response.json(await createCapture(database, userId, parsed.data), { status: 201 }),
    );
  } catch (error) {
    return withApiCors(request, miningErrorResponse(error));
  }
}

export const OPTIONS = apiPreflight;

function assertCaptureLengths(input: {
  originalSentence?: string | null;
  source?: string | null;
  text: string;
}) {
  const limits = {
    originalSentence: env.CAPTURE_CONTEXT_MAX_LENGTH,
    source: env.CAPTURE_SOURCE_MAX_LENGTH,
    text: env.CAPTURE_TEXT_MAX_LENGTH,
  };
  if (
    (limits.text !== undefined && input.text.length > limits.text) ||
    (limits.originalSentence !== undefined &&
      (input.originalSentence?.length ?? 0) > limits.originalSentence) ||
    (limits.source !== undefined && (input.source?.length ?? 0) > limits.source)
  ) {
    throw new MiningError("CAPTURE_TOO_LONG", "Reduza o texto antes de salvar.", 413);
  }
}
