import type { User } from "better-auth";
import { requireUser } from "@/modules/auth/server/auth-utils";
import { miningErrorResponse } from "@/modules/mining/shared/server/errors";
import { isAllowedOrigin, withCors } from "./cors";

type AuthenticatedHandler = (
  request: Request,
  context: { params: Promise<Record<string, string>>; user: User },
) => Promise<Response>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> },
  ) => {
    try {
      const user = await requireUser(request);

      return withCors(request, await handler(request, { ...context, user }));
    } catch (error) {
      return withCors(request, miningErrorResponse(error));
    }
  };
}

export function withJsonAuth(handler: AuthenticatedHandler) {
  return withAuth(async (request, context) => {
    requireJsonRequest(request);
    return handler(request, context);
  });
}

function requireJsonRequest(request: Request) {
  const origin = request.headers.get("origin");
  const isBearerRequest = request.headers.get("authorization")?.startsWith("Bearer ") ?? false;

  if ((origin && !isAllowedOrigin(origin)) || (!origin && !isBearerRequest)) {
    throw Response.json(
      { code: "ORIGIN_NOT_ALLOWED", error: "Request origin is not allowed." },
      { status: 403 },
    );
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw Response.json(
      { code: "CONTENT_TYPE_NOT_ALLOWED", error: "Send JSON data." },
      { status: 415 },
    );
  }
}
