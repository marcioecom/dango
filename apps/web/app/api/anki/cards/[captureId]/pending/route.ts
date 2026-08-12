import { ankiDeliveryTransitionSchema } from "@dango/domain";
import { z } from "zod";

import { markCardPending } from "@/modules/anki/server/deliveries";
import {
  MiningError,
  parseJsonRequest,
} from "@/modules/mining/shared/server/errors";
import { withJsonAuth } from "@/server/auth";
import { preflight } from "@/server/cors";

export const POST = withJsonAuth(async (request, { params, user }) => {
  const input = ankiDeliveryTransitionSchema.safeParse(
    await parseJsonRequest(request),
  );
  const { captureId } = await params;

  if (!input.success || !z.uuid().safeParse(captureId).success) {
    throw new MiningError(
      "INVALID_ANKI_TRANSITION",
      "Revise os dados da sincronização.",
      400,
    );
  }

  const receipt = await markCardPending(
    user.id,
    captureId,
    input.data.approvalId,
  );

  return Response.json(receipt);
});

export const OPTIONS = preflight;
