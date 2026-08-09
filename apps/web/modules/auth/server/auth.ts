import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins/bearer";
import { Resend } from "resend";

import { database } from "@/db/runtime";
import { authSchema } from "@/db/schema/auth";
import { env } from "@/lib/env";

const resend = new Resend(env.RESEND_API_KEY);

export const auth = betterAuth({
  appName: "Dango",
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.BETTER_AUTH_URL, ...env.AUTH_TRUSTED_ORIGINS],
  database: drizzleAdapter(database, {
    provider: "pg",
    schema: authSchema,
    usePlural: true,
    debugLogs: env.NODE_ENV === 'development'
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignIn: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { error } = await resend.emails.send({
        from: env.AUTH_EMAIL_FROM,
        html: `<p>Open this link to verify your email:</p><p><a href="${url}">${url}</a></p>`,
        subject: "Verify your Dango email",
        to: user.email,
      });
      if (error) throw new Error(error.message);
    },
  },
  plugins: [bearer({ requireSignature: true })],
  rateLimit: { enabled: true, storage: "database" },
  secret: env.BETTER_AUTH_SECRET,
});

export type AuthSession = typeof auth.$Infer.Session;
