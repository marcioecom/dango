import { corsPreflight, withCors } from "@/lib/cors";
import { runtimeOrigins } from "@/lib/runtime-origins";
import { MiningError } from "./errors";

export function assertSecureMutation(request: Request) {
  const origin = request.headers.get("origin");
  const bearerRequest = request.headers.get("authorization")?.startsWith("Bearer ") ?? false;

  if ((origin && !runtimeOrigins.has(origin)) || (!origin && !bearerRequest)) {
    throw new MiningError("ORIGIN_NOT_ALLOWED", "Origem da requisição não permitida.", 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new MiningError("CONTENT_TYPE_NOT_ALLOWED", "Envie os dados como JSON.", 415);
  }
}

export function withApiCors(request: Request, response: Response) {
  return withCors(request, response, runtimeOrigins);
}

export function apiPreflight(request: Request) {
  return corsPreflight(request, runtimeOrigins);
}
