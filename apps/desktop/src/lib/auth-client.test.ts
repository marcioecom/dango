import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./http", () => ({ desktopFetch: vi.fn() }));

import { desktopFetch } from "./http";

describe("auth client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("sends the bearer token without cookie credentials", async () => {
    vi.mocked(desktopFetch).mockResolvedValue(Response.json(null));
    const { authClient, setAuthToken } = await import("./auth-client");
    setAuthToken("session-token");

    await authClient.getSession();

    const init = vi.mocked(desktopFetch).mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe("omit");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer session-token");
  });
});
