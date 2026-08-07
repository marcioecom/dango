import { afterEach, describe, expect, it, vi } from "vitest";

describe("auth client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("sends the bearer token without cookie credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(null));
    vi.stubGlobal("fetch", fetchMock);
    const { authClient, setAuthToken } = await import("./auth-client");
    setAuthToken("session-token");

    await authClient.getSession();

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe("omit");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer session-token");
  });
});
