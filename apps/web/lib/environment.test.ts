import { describe, expect, it } from "vitest";

import { environmentSchema } from "./environment";

const validEnvironment = {
  AI_GATEWAY_API_KEY: "gateway-key",
  AI_GENERATION_TIMEOUT_SECONDS: "60",
  AUTH_ALLOWED_EMAILS: "ana@example.com",
  AUTH_EMAIL_FROM: "Dango <conta@example.com>",
  AUTH_TRUSTED_ORIGINS: "http://localhost:1420,tauri://localhost",
  BETTER_AUTH_SECRET: "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres",
  BETTER_AUTH_URL: "http://localhost:3000",
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/dango",
  RESEND_API_KEY: "resend-key",
};

describe("environment", () => {
  it("coerces configured numeric values and leaves unmeasured limits undefined outside production", () => {
    const environment = environmentSchema.parse(validEnvironment);

    expect(environment.AI_DAILY_GENERATION_LIMIT).toBeUndefined();
    expect(environment).toMatchObject({
      AI_GENERATION_TIMEOUT_SECONDS: 60,
      NODE_ENV: "development",
    });
  });

  it("rejects missing measured limits in production", () => {
    expect(() => environmentSchema.parse({ ...validEnvironment, NODE_ENV: "production" })).toThrowError(
      /AI_DAILY_GENERATION_LIMIT/,
    );
  });

  it("rejects invalid URLs", () => {
    expect(() => environmentSchema.parse({ ...validEnvironment, DATABASE_URL: "not-a-url" })).toThrowError(
      /DATABASE_URL/,
    );
  });
});
