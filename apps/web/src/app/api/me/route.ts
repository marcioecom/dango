import { corsPreflight } from "@/lib/cors";
import { runtimeOrigins } from "@/lib/runtime-origins";
import { auth } from "@/modules/auth/server/auth";
import { createIdentityHandler } from "@/modules/auth/server/identity";

export const GET = createIdentityHandler(
  async (headers) => auth.api.getSession({ headers }),
  runtimeOrigins,
);

export function OPTIONS(request: Request) {
  return corsPreflight(request, runtimeOrigins);
}
