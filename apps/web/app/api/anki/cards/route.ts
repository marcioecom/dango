import { listApprovedCards } from "@/modules/anki/server/deliveries";
import { withAuth } from "@/server/auth";
import { preflight } from "@/server/cors";

export const GET = withAuth(async (_request, { user }) => {
  const cards = await listApprovedCards(user.id);

  return Response.json(cards);
});

export const OPTIONS = preflight;
