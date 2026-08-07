const ALLOWED_METHODS = "GET, POST, OPTIONS";
const ALLOWED_HEADERS = "Authorization, Content-Type";

export function getCorsOrigin(request: Request, allowedOrigins: ReadonlySet<string>) {
  const origin = request.headers.get("origin");
  return origin && allowedOrigins.has(origin) ? origin : null;
}

export function withCors(request: Request, response: Response, allowedOrigins: ReadonlySet<string>) {
  const origin = getCorsOrigin(request, allowedOrigins);
  if (!origin) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Expose-Headers", "set-auth-token");
  headers.set("Vary", "Origin");

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export function corsPreflight(request: Request, allowedOrigins: ReadonlySet<string>) {
  if (!getCorsOrigin(request, allowedOrigins)) {
    return new Response(null, { status: 403 });
  }
  return withCors(request, new Response(null, { status: 204 }), allowedOrigins);
}
