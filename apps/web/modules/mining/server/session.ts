import "server-only";

import { auth } from "@/modules/auth/server/auth";
import { MiningError } from "./errors";

export async function requireUserId(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw new MiningError("UNAUTHENTICATED", "Entre novamente para continuar.", 401);
  }
  return session.user.id;
}
