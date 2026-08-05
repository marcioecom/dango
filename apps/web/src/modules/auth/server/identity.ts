import type { AuthenticatedUser, IdentityResponse } from "@dango/api-client";

import { withCors } from "@/lib/cors";

type GetSession = (headers: Headers) => Promise<{ user: AuthenticatedUser } | null>;

export function createIdentityHandler(
  getSession: GetSession,
  allowedOrigins: ReadonlySet<string>,
) {
  return async function getIdentity(request: Request) {
    const session = await getSession(request.headers);
    const response = session
      ? Response.json({
          user: {
            email: session.user.email,
            emailVerified: session.user.emailVerified,
            id: session.user.id,
            name: session.user.name,
          },
        } satisfies IdentityResponse)
      : Response.json({ error: "Não autenticado." }, { status: 401 });

    return withCors(request, response, allowedOrigins);
  };
}
