import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ isTauri: vi.fn() }));
vi.mock("@tauri-apps/plugin-http", () => ({ fetch: vi.fn() }));

describe("desktop HTTP transport", () => {
  afterEach(() => {
    vi.mocked(isTauri).mockReset();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("uses the browser transport outside Tauri", async () => {
    const browserFetch = vi.fn();
    vi.stubGlobal("fetch", browserFetch);
    vi.mocked(isTauri).mockReturnValue(false);

    const { desktopFetch } = await import("./http");

    expect(desktopFetch).toBe(browserFetch);
  });

  it("uses the native transport inside Tauri", async () => {
    vi.mocked(isTauri).mockReturnValue(true);

    const { desktopFetch } = await import("./http");

    expect(desktopFetch).toBe(tauriFetch);
  });
});
