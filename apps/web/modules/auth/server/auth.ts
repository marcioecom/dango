import { waitUntil } from "@vercel/functions";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { bearer } from "better-auth/plugins/bearer";
import { Resend } from "resend";

import { database } from "@/db/runtime";
import { authSchema } from "@/db/schema/auth";
import { env } from "@/lib/env";

const baseUrl = env.BETTER_AUTH_URL;
const trustedOrigins = [
  baseUrl,
  ...env.AUTH_TRUSTED_ORIGINS
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];
const allowedEmails = new Set(
  env.AUTH_ALLOWED_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);
const resend = new Resend(env.RESEND_API_KEY);

export const auth = betterAuth({
  appName: "Dango",
  baseURL: baseUrl,
  database: drizzleAdapter(database, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignIn: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      const task = resend.emails.send({
        from: env.AUTH_EMAIL_FROM,
        html: `<p>Open this link to verify your email:</p><p><a href="${url}">${url}</a></p>`,
        subject: "Verify your Dango email",
        to: user.email,
      });
      if (env.VERCEL) {
        waitUntil(
          task.then(({ error }) => {
            if (error) throw new Error(error.message);
          }),
        );
        return;
      }
      const { error } = await task;
      if (error) throw new Error(error.message);
    },
  },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      if (context.path !== "/sign-up/email") return;

      const body = context.body as { email?: unknown; name?: unknown; password?: unknown } | undefined;
      if (typeof body?.email !== "string" || typeof body.password !== "string") {
        throw new APIError("BAD_REQUEST", { message: "Unable to create account." });
      }

      const email = body.email.trim().toLowerCase();
      body.email = email;
      if (allowedEmails.has(email)) return;

      await context.context.password.hash(body.password);
      return context.json({
        token: null,
        user: {
          createdAt: new Date(),
          email,
          emailVerified: false,
          id: context.context.generateId({ model: "user" }),
          image: null,
          name: typeof body.name === "string" ? body.name : "",
          updatedAt: new Date(),
        },
      });
    }),
  },
  plugins: [bearer({ requireSignature: true })],
  rateLimit: { enabled: true, storage: "database" },
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins,
});

export type AuthSession = typeof auth.$Infer.Session;
