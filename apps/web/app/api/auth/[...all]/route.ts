import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/modules/auth/server/auth";
import { preflight, withCors } from "@/server/cors";

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  return withCors(request, await handler.GET(request));
}

export async function POST(request: Request) {
  return withCors(request, await handler.POST(request));
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
