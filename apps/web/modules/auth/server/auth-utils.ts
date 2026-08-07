import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

export async function requireUnauth() {
  if (await getSession()) redirect("/inbox");
}

export async function requireUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw new Response(JSON.stringify({ code: "UNAUTHENTICATED", error: "Sign in again to continue." }), {
      headers: { "Content-Type": "application/json" },
      status: 401,
    });
  }
  return session.user;
}
