import { beforeEach, describe, expect, it, vi } from "vitest";

import { detectInitialLocale, normalizeLocale } from "./i18n";

describe("locale detection", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("ignores unsupported languages before a compatible preference", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es-ES", "pt-BR"]);

    expect(detectInitialLocale()).toBe("pt-BR");
  });

  it("accepts only Portuguese and English variants", () => {
    expect(normalizeLocale("pt-PT")).toBe("pt-BR");
    expect(normalizeLocale("en-US")).toBe("en");
  });
});
