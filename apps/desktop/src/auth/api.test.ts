import { afterEach, describe, expect, it, vi } from "vitest";

import { revokeSession } from "./api";

describe("authentication API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia JSON válido ao revogar a sessão", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await revokeSession("session-token");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/sign-out",
      expect.objectContaining({ body: "{}", method: "POST" }),
    );
  });
});
