import {
  ankiDeliveryReceiptSchema,
  approvedCardListSchema,
  type AnkiDeliveryReceipt,
} from "@dango/domain";
import { z } from "zod";

import { authBaseUrl, getAuthToken } from "../../lib/auth-client";

const apiErrorSchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
});

export class AnkiApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AnkiApiError";
  }
}

export async function listApprovedCards() {
  return approvedCardListSchema.parse(await request("/api/anki/cards"));
}

export async function markRemoteCardPending(captureId: string, approvalId: string) {
  return transition(captureId, approvalId, "pending");
}

export async function markRemoteCardSent(captureId: string, approvalId: string) {
  return transition(captureId, approvalId, "sent");
}

async function transition(
  captureId: string,
  approvalId: string,
  state: "pending" | "sent",
): Promise<AnkiDeliveryReceipt> {
  return ankiDeliveryReceiptSchema.parse(
    await request(`/api/anki/cards/${captureId}/${state}`, {
      body: JSON.stringify({ approvalId }),
      method: "POST",
    }),
  );
}

async function request(path: string, init?: RequestInit) {
  const token = getAuthToken();
  if (!token) {
    throw new AnkiApiError("AUTH_REQUIRED", 401, "Authentication is required.");
  }

  let response: Response;
  try {
    response = await fetch(new URL(path, authBaseUrl), {
      ...init,
      credentials: "omit",
      headers: {
        authorization: `Bearer ${token}`,
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new AnkiApiError("NETWORK_ERROR", 0, "The service could not be reached.");
  }

  const body: unknown = await response.json();
  if (!response.ok) {
    const error = apiErrorSchema.safeParse(body);
    throw new AnkiApiError(
      error.success ? (error.data.code ?? "REQUEST_FAILED") : "REQUEST_FAILED",
      response.status,
      error.success ? (error.data.error ?? "The request failed.") : "The request failed.",
    );
  }
  return body;
}
