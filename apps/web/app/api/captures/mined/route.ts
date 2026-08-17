import {
  listMinedCaptures,
  type MinedCaptureStatus,
} from "@/modules/mining/shared/server/captures";
import { MiningError } from "@/modules/mining/shared/server/errors";
import { withAuth } from "@/server/auth";
import { preflight } from "@/server/cors";

const minedStatuses: MinedCaptureStatus[] = ["approved", "pending_anki", "sent_to_anki"];

export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (status !== null && !minedStatuses.includes(status as MinedCaptureStatus)) {
    throw new MiningError("INVALID_STATUS", "Situação inválida para a lista de minerados.", 400);
  }

  const page = await listMinedCaptures(user.id, {
    cursor: searchParams.get("cursor") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    status: (status as MinedCaptureStatus | null) ?? undefined,
  });

  return Response.json(page);
});

export const OPTIONS = preflight;
