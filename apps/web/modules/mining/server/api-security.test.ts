import { afterEach, describe, expect, it } from "vitest";

import { runtimeOrigins } from "@/lib/runtime-origins";
import { apiPreflight, assertSecureMutation } from "./api-security";

const ALLOWED_ORIGIN = "https://dango.example.com";

describe("mining API protection", () => {
  afterEach(() => runtimeOrigins.delete(ALLOWED_ORIGIN));

  it("accepts JSON from the trusted origin and responds to preflight", () => {
    runtimeOrigins.add(ALLOWED_ORIGIN);
    const request = new Request(`${ALLOWED_ORIGIN}/api/captures`, {
      headers: { "content-type": "application/json", origin: ALLOWED_ORIGIN },
      method: "POST",
    });

    expect(() => assertSecureMutation(request)).not.toThrow();
    expect(apiPreflight(request).status).toBe(204);
  });

  it("rejects an external origin and cookie mutation without Origin", () => {
    expect(() =>
      assertSecureMutation(
        new Request("https://dango.example.com/api/captures", {
          headers: { "content-type": "application/json", origin: "https://hostil.example" },
          method: "POST",
        }),
      ),
    ).toThrowError(expect.objectContaining({ code: "ORIGIN_NOT_ALLOWED" }));

    expect(() =>
      assertSecureMutation(
        new Request("https://dango.example.com/api/captures", {
          headers: { "content-type": "application/json", cookie: "session=valor" },
          method: "POST",
        }),
      ),
    ).toThrowError(expect.objectContaining({ code: "ORIGIN_NOT_ALLOWED" }));
  });

  it("allows a bearer client without Origin and requires JSON", () => {
    expect(() =>
      assertSecureMutation(
        new Request("https://dango.example.com/api/captures", {
          headers: { authorization: "Bearer token", "content-type": "application/json" },
          method: "POST",
        }),
      ),
    ).not.toThrow();

    expect(() =>
      assertSecureMutation(
        new Request("https://dango.example.com/api/captures", {
          headers: { authorization: "Bearer token", "content-type": "text/plain" },
          method: "POST",
        }),
      ),
    ).toThrowError(expect.objectContaining({ code: "CONTENT_TYPE_NOT_ALLOWED" }));
  });
});
