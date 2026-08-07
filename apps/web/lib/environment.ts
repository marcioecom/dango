import { z } from "zod";

const optionalPositiveInteger = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

export const environmentSchema = z
  .object({
    AI_DAILY_GENERATION_LIMIT: optionalPositiveInteger,
    AI_GATEWAY_API_KEY: z.string().min(1),
    AI_GENERATION_TIMEOUT_SECONDS: z.coerce.number().int().positive(),
    APPROVAL_SENTENCE_MAX_LENGTH: optionalPositiveInteger,
    AUTH_ALLOWED_EMAILS: z.string().trim().min(1),
    AUTH_EMAIL_FROM: z.string().trim().min(1),
    AUTH_TRUSTED_ORIGINS: z.string().trim().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CAPTURE_CONTEXT_MAX_LENGTH: optionalPositiveInteger,
    CAPTURE_SOURCE_MAX_LENGTH: optionalPositiveInteger,
    CAPTURE_TEXT_MAX_LENGTH: optionalPositiveInteger,
    DATABASE_URL: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    RESEND_API_KEY: z.string().min(1),
    VERCEL: z.string().optional(),
  })
  // TODO: remove this
  .superRefine((value, context) => {
    if (value.NODE_ENV !== "production") return;

    for (const key of [
      "AI_DAILY_GENERATION_LIMIT",
      "APPROVAL_SENTENCE_MAX_LENGTH",
      "CAPTURE_CONTEXT_MAX_LENGTH",
      "CAPTURE_SOURCE_MAX_LENGTH",
      "CAPTURE_TEXT_MAX_LENGTH",
    ] as const) {
      if (value[key] === undefined) {
        context.addIssue({
          code: "custom",
          message: "Obrigatória em produção.",
          path: [key],
        });
      }
    }
  });

export const env = environmentSchema.parse(process.env);
