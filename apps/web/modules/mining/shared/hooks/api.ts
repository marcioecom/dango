import type { ApproveCaptureInput, Capture, CreateCaptureInput, MiningSession } from "@dango/domain";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type CaptureDecisionAction = "defer" | "discard" | "restore" | "undo_approval";

export async function listCaptures() {
  return request<{ captures: Capture[] }>("/api/captures");
}

export type MinedCapturesPage = {
  captures: Capture[];
  nextCursor: string | null;
};

export async function listMinedCaptures(filters: {
  search?: string;
  status?: string;
  cursor?: string | null;
}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.cursor) params.set("cursor", filters.cursor);
  const queryString = params.toString();
  return request<MinedCapturesPage>(
    `/api/captures/mined${queryString ? `?${queryString}` : ""}`,
  );
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

export async function generateCaptures(captureIds: string[], id: string) {
  return request<Capture[]>("/api/generations", {
    body: JSON.stringify({ captureIds, id }),
    method: "POST",
  });
}

export async function approveCapture(captureId: string, input: ApproveCaptureInput) {
  return request<Capture>(`/api/captures/${captureId}/approval`, {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function decideCapture(
  captureId: string,
  action: CaptureDecisionAction,
) {
  return request<Capture>(`/api/captures/${captureId}/decision`, {
    body: JSON.stringify({ action }),
    method: "POST",
  });
}

export async function createMiningSession(input: { captureIds: string[]; id: string }) {
  return request<MiningSession>("/api/sessions", {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function getMiningSession(sessionId: string) {
  return request<MiningSession>(`/api/sessions/${sessionId}`);
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
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
