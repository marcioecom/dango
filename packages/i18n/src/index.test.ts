import { beforeEach, describe, expect, it, vi } from "vitest";

import { detectInitialLocale, languageStorageKey, normalizeLocale } from "./index";

describe("locales", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("uses a compatible browser preference when no locale was saved", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es-ES", "pt-BR"]);

    expect(detectInitialLocale()).toBe("pt-BR");
  });

  it("prefers a saved supported locale", () => {
    window.localStorage.setItem(languageStorageKey, "en-US");

    expect(detectInitialLocale()).toBe("en");
  });

  it("accepts only Portuguese and English variants", () => {
    expect(normalizeLocale("pt-PT")).toBe("pt-BR");
    expect(normalizeLocale("en-US")).toBe("en");
    expect(normalizeLocale("es-ES")).toBeNull();
  });
});
