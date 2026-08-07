import { waitUntil } from "@vercel/functions";

import { database } from "@/db/runtime";
import { env } from "@/lib/environment";
import { parseAllowedEmails } from "./allowed-emails";
import { createAuth } from "./create-auth";
import { createResendVerificationEmailSender } from "./verification-email";

const baseUrl = env.BETTER_AUTH_URL;
const trustedOrigins = [
  baseUrl,
  ...env.AUTH_TRUSTED_ORIGINS
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

export const auth = createAuth({
  allowedEmails: parseAllowedEmails(env.AUTH_ALLOWED_EMAILS),
  baseUrl,
  db: database,
  schedule(task) {
    if (env.VERCEL) {
      waitUntil(task);
      return;
    }
    return task;
  },
  secret: env.BETTER_AUTH_SECRET,
  sendVerificationEmail: createResendVerificationEmailSender({
    apiKey: env.RESEND_API_KEY,
    from: env.AUTH_EMAIL_FROM,
  }),
  trustedOrigins,
});

export type AuthSession = typeof auth.$Infer.Session;
