import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decodeMinedCursor, encodeMinedCursor, escapeIlikePattern } from "./mined-cursor";

describe("mined cursor", () => {
  it("round-trips a cursor through encode and decode", () => {
    const updatedAt = new Date("2026-08-17T12:34:56.789Z");
    const id = "3f8b2a1c-9d4e-4f5a-8b6c-7d0e1f2a3b4c";

    const decoded = decodeMinedCursor(encodeMinedCursor({ id, updatedAt }));

    expect(decoded.id).toBe(id);
    expect(decoded.updatedAt.toISOString()).toBe(updatedAt.toISOString());
  });

  it("rejects a cursor that is not base64url JSON", () => {
    expect(() => decodeMinedCursor("!!!not-a-cursor!!!")).toThrowError(
      expect.objectContaining({ code: "INVALID_CURSOR" }),
    );
  });

  it("rejects a cursor with the wrong shape", () => {
    const wrongShape = Buffer.from(JSON.stringify({ page: 2 }), "utf8").toString("base64url");

    expect(() => decodeMinedCursor(wrongShape)).toThrowError(
      expect.objectContaining({ code: "INVALID_CURSOR" }),
    );
  });

  it("rejects a cursor with a non-ISO date", () => {
    const badDate = Buffer.from(
      JSON.stringify({ id: "3f8b2a1c-9d4e-4f5a-8b6c-7d0e1f2a3b4c", u: "yesterday" }),
      "utf8",
    ).toString("base64url");

    expect(() => decodeMinedCursor(badDate)).toThrowError(
      expect.objectContaining({ code: "INVALID_CURSOR" }),
    );
  });
});

describe("escapeIlikePattern", () => {
  it("escapes LIKE wildcards and the escape character itself", () => {
    expect(escapeIlikePattern("100% sure_thing\\now")).toBe("100\\% sure\\_thing\\\\now");
  });

  it("leaves plain text untouched", () => {
    expect(escapeIlikePattern("get away with")).toBe("get away with");
  });
});
