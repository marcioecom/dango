# anki-miner

Desktop-first tool for capturing English words and expressions, reviewing AI-generated example sentences, generating audio, and delivering approved cards to a local Anki installation.

This repository is the successor to the Python `anki-automator` CLI. The CLI remains a separate reference implementation and fallback during migration.

## Current status

The repository contains the agreed product specification and an empty monorepo scaffold. Application packages will be created incrementally while implementing the issues in the [anki-miner Linear project](https://linear.app/leapstark/project/anki-miner-edaa39ba53b2).

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

No app dependencies have been installed yet. Each package should be created when its first vertical slice requires it.
