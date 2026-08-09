import { env } from "@/lib/env";

const allowedMethods = "GET, POST, OPTIONS";
const allowedHeaders = "Authorization, Content-Type";
const allowedOrigins = new Set([env.BETTER_AUTH_URL, ...env.AUTH_TRUSTED_ORIGINS]);

function getAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin && allowedOrigins.has(origin) ? origin : null;
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

// TODO: remove this
export function assertJsonMutation(request: Request) {
  const origin = request.headers.get("origin");
  const isBearerRequest = request.headers.get("authorization")?.startsWith("Bearer ") ?? false;

  if ((origin && !allowedOrigins.has(origin)) || (!origin && !isBearerRequest)) {
    throw new Response(JSON.stringify({ code: "ORIGIN_NOT_ALLOWED", error: "Request origin is not allowed." }), {
      headers: { "Content-Type": "application/json" },
      status: 403,
    });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new Response(JSON.stringify({ code: "CONTENT_TYPE_NOT_ALLOWED", error: "Send JSON data." }), {
      headers: { "Content-Type": "application/json" },
      status: 415,
    });
  }
}
