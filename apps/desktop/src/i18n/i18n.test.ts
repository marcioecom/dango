import { beforeEach, describe, expect, it, vi } from "vitest";

import { detectInitialLocale, normalizeLocale } from "./i18n";

describe("locale detection", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("ignora idiomas não suportados antes de uma preferência compatível", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es-ES", "pt-BR"]);

    expect(detectInitialLocale()).toBe("pt-BR");
  });

  it("aceita somente variantes de português e inglês", () => {
    expect(normalizeLocale("pt-PT")).toBe("pt-BR");
    expect(normalizeLocale("en-US")).toBe("en");
    expect(normalizeLocale("es-ES")).toBeNull();
  });
});
