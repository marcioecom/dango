import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const directory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": directory,
    },
  },
  test: {
    env: {
      AI_GATEWAY_API_KEY: "gateway-key",
      AUTH_EMAIL_FROM: "Dango <conta@example.com>",
      AUTH_TRUSTED_ORIGINS: "tauri://localhost",
      BETTER_AUTH_SECRET: "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres",
      BETTER_AUTH_URL: "http://localhost:3000",
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/dango",
      DEFAULT_MODEL: "openai/gpt-5-mini",
      FALLBACK_MODEL: "google/gemini-2.5-flash",
      RESEND_API_KEY: "resend-key",
    },
    restoreMocks: true,
  },
});
