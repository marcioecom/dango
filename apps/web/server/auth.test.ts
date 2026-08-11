import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn() }));

vi.mock("@/modules/auth/server/auth-utils", () => ({
  requireUser: mocks.requireUser,
}));

import { MiningError } from "@/modules/mining/shared/server/errors";
import { withAuth, withJsonAuth } from "./auth";

const context = { params: Promise.resolve({}) };
const user = { id: "user-1" };

describe("authenticated API handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue(user);
  });

  it("adds CORS headers to successful authenticated responses", async () => {
    const response = await withAuth(async (_request, { user: authenticatedUser }) => {
      expect(authenticatedUser).toBe(user);
      return Response.json({ ok: true });
    })(new Request("http://localhost:3000/api/cards", { headers: { origin: "http://localhost:3000" } }), context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
  });

  it("returns the authentication response instead of throwing it", async () => {
    mocks.requireUser.mockRejectedValue(
      Response.json({ code: "UNAUTHENTICATED" }, { status: 401 }),
    );

    const response = await withAuth(async () => Response.json({ ok: true }))(
      new Request("http://localhost:3000/api/cards"),
      context,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ code: "UNAUTHENTICATED" });
  });

  it("serializes domain errors and rejects non-JSON mutations", async () => {
    const domainErrorResponse = await withAuth(async () => {
      throw new MiningError("INVALID_CAPTURE", "Dados inválidos.", 400);
    })(new Request("http://localhost:3000/api/cards"), context);
    const contentTypeResponse = await withJsonAuth(async () => Response.json({ ok: true }))(
      new Request("http://localhost:3000/api/cards", {
        method: "POST",
        headers: { origin: "http://localhost:3000" },
      }),
      context,
    );

    expect(domainErrorResponse.status).toBe(400);
    await expect(domainErrorResponse.json()).resolves.toEqual({
      code: "INVALID_CAPTURE",
      error: "Dados inválidos.",
    });
    expect(contentTypeResponse.status).toBe(415);
  });
});
