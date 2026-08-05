import { auth } from "@/lib/auth";
import { corsPreflight, withCors } from "@/lib/cors";
import { runtimeOrigins } from "@/lib/runtime-origins";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const response = session
    ? Response.json({
        user: {
          email: session.user.email,
          emailVerified: session.user.emailVerified,
          id: session.user.id,
          name: session.user.name,
        },
      })
    : Response.json({ error: "Não autenticado." }, { status: 401 });

  return withCors(request, response, runtimeOrigins);
}

export function OPTIONS(request: Request) {
  return corsPreflight(request, runtimeOrigins);
}
