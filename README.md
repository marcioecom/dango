# anki-miner

Desktop-first tool for capturing English words and expressions, reviewing AI-generated example sentences, generating audio, and delivering approved cards to a local Anki installation.

This repository is the successor to the Python `anki-automator` CLI. The CLI remains a separate reference implementation and fallback during migration.

## Current status

The first authenticated vertical slice is implemented. Allowed users can create and verify an account, sign in through the Tauri desktop, restore a signed session from the macOS Keychain, and revoke it remotely on logout. Remaining product capabilities continue to be introduced incrementally through the [anki-miner Linear project](https://linear.app/leapstark/project/anki-miner-edaa39ba53b2).

## Planned structure

```text
apps/
  desktop/      Tauri 2 desktop app with React and TypeScript
  web/          Next.js backend and future installable PWA
packages/
  domain/       Shared domain schemas and state transitions
  api-client/   Typed API and synchronization client
  ui/           UI shared only when desktop and PWA need it
docs/adr/       Architecture decision records
```

Read `PRODUCT.md`, `SPEC.md`, and `docs/adr/` before implementation.

## Tooling

- Node package manager: pnpm
- Desktop: Tauri 2, React, TypeScript, Vite
- Web and API: Next.js on Vercel
- Authentication: Better Auth
- Remote persistence: Postgres
- Local desktop persistence: SQLite

## Local authentication flow

1. Copy the variables from `apps/web/.env.example` to `apps/web/.env.local` and fill in real secrets and allowed emails.
2. Copy `apps/desktop/.env.example` to `apps/desktop/.env` when the API is not at the default local URL.
3. Run `pnpm db:up` and `pnpm db:migrate`.
4. Run the API with `pnpm --filter @anki-miner/web dev`.
5. Run the native desktop with `pnpm dev:desktop`.

Use `pnpm check` and `pnpm test` to verify the complete workspace. Backend integration tests require Docker.
