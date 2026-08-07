import { describe, expect, it } from "vitest";

import { normalizeEmail, parseAllowedEmails } from "./allowed-emails";

describe("allowed emails", () => {
  it("normalizes casing and outer whitespace", () => {
    expect(normalizeEmail("  Pessoa@Example.COM ")).toBe("pessoa@example.com");
    expect(parseAllowedEmails(" Pessoa@Example.COM,outra@example.com ")).toEqual(
      new Set(["pessoa@example.com", "outra@example.com"]),
    );
  });

  it("rejects an empty configuration", () => {
    expect(() => parseAllowedEmails(" , ")).toThrow(
      "AUTH_ALLOWED_EMAILS deve conter pelo menos um email.",
    );
  });
});
