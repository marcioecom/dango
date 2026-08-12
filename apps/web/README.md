# Dango web

Next.js API that owns authentication and remote data. The current slice provides private email-and-password accounts through Better Auth, Postgres persistence, a server-side allowlist, Resend verification, signed bearer sessions for Tauri, and an authenticated identity endpoint.

## Configuration

Copy the values described in `.env.example` to `.env.local`. Use a generated `BETTER_AUTH_SECRET`, real allowed addresses, a Resend API key, and a sender on a verified domain.

Run migrations before starting the API:

```bash
pnpm db:up
pnpm db:migrate
pnpm --filter @dango/web dev
```

`AUTH_TRUSTED_ORIGINS` must explicitly contain the Vite development origin and the production Tauri origin. The allowlist stays exclusively on the server.

The canonical production origin is `https://dango.marcio.run`. Set `BETTER_AUTH_URL` to this exact value in the production environment so authentication and email-verification links never depend on a Vercel deployment alias.

## Verification

```bash
pnpm --filter @dango/web check
pnpm --filter @dango/web test
```

Integration tests start an isolated Postgres container and do not call Resend.
