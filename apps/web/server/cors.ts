import { env } from "@/lib/env";

const allowedMethods = "GET, POST, OPTIONS";
const allowedHeaders = "Authorization, Content-Type";
const allowedOrigins = new Set([env.BETTER_AUTH_URL, ...env.AUTH_TRUSTED_ORIGINS]);

export function isAllowedOrigin(origin: string | null) {
  return origin !== null && allowedOrigins.has(origin);
}

function getAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return isAllowedOrigin(origin) ? origin : null;
}

export function withCors(request: Request, response: Response) {
  const origin = getAllowedOrigin(request);
  if (!origin) return response;

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Headers", allowedHeaders);
  headers.set("Access-Control-Allow-Methods", allowedMethods);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Expose-Headers", "set-auth-token");
  headers.set("Vary", "Origin");

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export function preflight(request: Request) {
  if (!getAllowedOrigin(request)) return new Response(null, { status: 403 });
  return withCors(request, new Response(null, { status: 204 }));
}
