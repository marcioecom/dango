import type { ApproveCaptureInput, Capture, CreateCaptureInput } from "@dango/domain";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function listCaptures() {
  return request<{ captures: Capture[] }>("/api/captures");
}

export async function saveCapture(input: CreateCaptureInput) {
  return request<Capture>("/api/captures", {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function generateCapture(captureId: string, id: string) {
  return request<Capture>(`/api/captures/${captureId}/generations`, {
    body: JSON.stringify({ id }),
    method: "POST",
  });
}

export async function approveCapture(captureId: string, input: ApproveCaptureInput) {
  return request<Capture>(`/api/captures/${captureId}/approval`, {
    body: JSON.stringify(input),
    method: "POST",
  });
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = (await response.json()) as T | { code?: string; error?: string };
  if (!response.ok) {
    const error = body as { code?: string; error?: string };
    throw new ApiError(
      error.error ?? "Não foi possível concluir a operação.",
      error.code ?? "REQUEST_FAILED",
      response.status,
    );
  }
  return body as T;
}
