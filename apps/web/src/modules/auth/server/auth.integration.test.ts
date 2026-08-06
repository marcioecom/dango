import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase } from "@/db";
import { user } from "@/db/schema/auth";
import { createAuth } from "./create-auth";
import type { VerificationEmail } from "./verification-email";

const BASE_URL = "http://localhost:3000";
const PASSWORD = "uma-senha-segura";

describe("desktop authentication", () => {
  let container: StartedPostgreSqlContainer;
  let closeDatabase: () => Promise<void>;
  let database: ReturnType<typeof createDatabase>["db"];
  const sentEmails: VerificationEmail[] = [];

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    const connection = createDatabase(container.getConnectionUri());
    closeDatabase = () => connection.client.end();
    database = connection.db;
    await migrate(database, { migrationsFolder: "drizzle" });
  }, 60_000);

  afterAll(async () => {
    await closeDatabase();
    await container.stop();
  });

  it("restringe cadastro, verifica emails e permite revogar a sessão", async () => {
    const allowedEmails = new Set(["ana@example.com"]);
    const auth = createAuth({
      allowedEmails,
      baseUrl: BASE_URL,
      db: database,
      rateLimitEnabled: false,
      schedule: (task) => task,
      secret: "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres",
      sendVerificationEmail: async (message) => {
        sentEmails.push(message);
      },
      trustedOrigins: [BASE_URL],
    });
    const refused = await postAuth(auth, "/sign-up/email", {
      email: "intruso@example.com",
      name: "Intruso",
      password: PASSWORD,
    });
    expect(refused.status).toBe(200);
    expect(await database.select().from(user).where(eq(user.email, "intruso@example.com"))).toHaveLength(0);

    await signUpAndVerify(auth, "ana@example.com", "Ana", sentEmails);

    const tokenAna = await signIn(auth, "ana@example.com");

    const logoutAna = await postAuth(auth, "/sign-out", undefined, tokenAna);
    expect(logoutAna.status).toBe(200);
  }, 60_000);
});

type Auth = ReturnType<typeof createAuth>;

async function postAuth(auth: Auth, path: string, body?: object, token?: string) {
  const headers = new Headers({ "content-type": "application/json", origin: BASE_URL });
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return auth.handler(
    new Request(`${BASE_URL}/api/auth${path}`, {
      body: JSON.stringify(body ?? {}),
      headers,
      method: "POST",
    }),
  );
}

async function signUpAndVerify(
  auth: Auth,
  email: string,
  name: string,
  sentEmails: VerificationEmail[],
) {
  const response = await postAuth(auth, "/sign-up/email", {
    callbackURL: `${BASE_URL}/email-verificado`,
    email,
    name,
    password: PASSWORD,
  });
  expect(response.status).toBe(200);

  const unverifiedLogin = await postAuth(auth, "/sign-in/email", { email, password: PASSWORD });
  expect(unverifiedLogin.status).toBe(403);

  const verification = sentEmails.findLast((message) => message.email === email);
  expect(verification).toBeDefined();
  const verifyResponse = await auth.handler(
    new Request(verification!.url, { headers: { origin: BASE_URL }, redirect: "manual" }),
  );
  expect(verifyResponse.status).toBe(302);
}

async function signIn(auth: Auth, email: string) {
  const response = await postAuth(auth, "/sign-in/email", { email, password: PASSWORD });
  expect(response.status).toBe(200);
  const token = response.headers.get("set-auth-token");
  expect(token).toBeTruthy();
  return token!;
}
