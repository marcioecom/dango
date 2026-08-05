import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { bearer } from "better-auth/plugins/bearer";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { authSchema } from "@/db/schema/auth";
import { normalizeEmail } from "./allowed-emails";
import type { VerificationEmailSender } from "./verification-email";

type AuthDatabase = PostgresJsDatabase<typeof authSchema>;

type CreateAuthOptions = {
  allowedEmails: Set<string>;
  baseUrl: string;
  db: AuthDatabase;
  rateLimitEnabled?: boolean;
  schedule: (task: Promise<void>) => void | Promise<void>;
  secret: string;
  sendVerificationEmail: VerificationEmailSender;
  trustedOrigins: string[];
};

export function createAuth(options: CreateAuthOptions) {
  return betterAuth({
    appName: "Anki Miner",
    baseURL: options.baseUrl,
    database: drizzleAdapter(options.db, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      sendVerificationEmail: async ({ user, url }) => {
        await options.schedule(options.sendVerificationEmail({ email: user.email, url }));
      },
    },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (context.path !== "/sign-up/email") {
          return;
        }

        const body = context.body as { email?: unknown; name?: unknown; password?: unknown } | undefined;
        if (typeof body?.email !== "string" || typeof body.password !== "string") {
          throw new APIError("BAD_REQUEST", { message: "Não foi possível criar a conta." });
        }

        const email = normalizeEmail(body.email);
        body.email = email;

        if (options.allowedEmails.has(email)) {
          return;
        }

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
    rateLimit: {
      enabled: options.rateLimitEnabled ?? true,
      storage: "database",
    },
    secret: options.secret,
    trustedOrigins: options.trustedOrigins,
  });
}
