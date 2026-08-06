import { describe, expect, it } from "vitest";

import { corsPreflight, withCors } from "@/lib/cors";

const origins = new Set(["http://localhost:1420", "tauri://localhost"]);

describe("CORS", () => {
  it("expõe o token somente para uma origem autorizada", () => {
    const request = new Request("http://localhost/api/auth/get-session", {
      headers: { origin: "tauri://localhost" },
    });
    const response = withCors(request, Response.json({ ok: true }), origins);

    expect(response.headers.get("access-control-allow-origin")).toBe("tauri://localhost");
    expect(response.headers.get("access-control-expose-headers")).toBe("set-auth-token");
  });

  it("não adiciona headers para uma origem desconhecida", () => {
    const request = new Request("http://localhost/api/auth/get-session", {
      headers: { origin: "https://malicioso.example" },
    });
    const response = withCors(request, Response.json({ ok: true }), origins);

    expect(response.headers.has("access-control-allow-origin")).toBe(false);
    expect(corsPreflight(request, origins).status).toBe(403);
  });
});
