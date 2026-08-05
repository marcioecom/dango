import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";
import { corsPreflight, withCors } from "@/lib/cors";
import { runtimeOrigins } from "@/lib/runtime-origins";

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  return withCors(request, await handler.GET(request), runtimeOrigins);
}

export async function POST(request: Request) {
  return withCors(request, await handler.POST(request), runtimeOrigins);
}

export function OPTIONS(request: Request) {
  return corsPreflight(request, runtimeOrigins);
}
