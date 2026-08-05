import { waitUntil } from "@vercel/functions";

import { createDatabase } from "@/db";
import { parseAllowedEmails } from "./allowed-emails";
import { createAuth } from "./create-auth";
import { createResendVerificationEmailSender } from "./verification-email";

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} não está configurada.`);
  }
  return value;
}

const baseUrl = requiredEnvironment("BETTER_AUTH_URL");
const { db } = createDatabase(requiredEnvironment("DATABASE_URL"));
const trustedOrigins = [
  baseUrl,
  ...requiredEnvironment("AUTH_TRUSTED_ORIGINS")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

export const auth = createAuth({
  allowedEmails: parseAllowedEmails(process.env.AUTH_ALLOWED_EMAILS),
  baseUrl,
  db,
  schedule(task) {
    if (process.env.VERCEL) {
      waitUntil(task);
      return;
    }
    return task;
  },
  secret: requiredEnvironment("BETTER_AUTH_SECRET"),
  sendVerificationEmail: createResendVerificationEmailSender({
    apiKey: requiredEnvironment("RESEND_API_KEY"),
    from: requiredEnvironment("AUTH_EMAIL_FROM"),
  }),
  trustedOrigins,
});

export type AuthSession = typeof auth.$Infer.Session;
