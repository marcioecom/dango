import { z } from "zod";

export const environmentSchema = z
  .object({
    VERCEL: z.string().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.url(),
    AUTH_ALLOWED_EMAILS: z.string().trim().min(1),
    AUTH_EMAIL_FROM: z.string().trim().min(1),
    AUTH_TRUSTED_ORIGINS: z.string().trim().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    AI_GATEWAY_API_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
  })

export const env = environmentSchema.parse(process.env);
