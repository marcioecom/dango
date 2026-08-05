import { describe, expect, it } from "vitest";

import { normalizeEmail, parseAllowedEmails } from "@/lib/allowed-emails";

describe("allowed emails", () => {
  it("normaliza caixa e espaços externos", () => {
    expect(normalizeEmail("  Pessoa@Example.COM ")).toBe("pessoa@example.com");
    expect(parseAllowedEmails(" Pessoa@Example.COM,outra@example.com ")).toEqual(
      new Set(["pessoa@example.com", "outra@example.com"]),
    );
  });

  it("recusa uma configuração vazia", () => {
    expect(() => parseAllowedEmails(" , ")).toThrow(
      "AUTH_ALLOWED_EMAILS deve conter pelo menos um email.",
    );
  });
});
