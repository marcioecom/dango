# Dango

Desktop-first tool for capturing English words and expressions, reviewing AI-generated example sentences, generating audio, and delivering approved cards to a local Anki installation.

This repository is the successor to the Python `anki-automator` CLI. The CLI remains a separate reference implementation and fallback during migration.

## Current status

The first authenticated vertical slice is implemented. Allowed users can create and verify an account, sign in through the Tauri desktop, restore a signed session from the macOS Keychain, and revoke it remotely on logout. Remaining product capabilities continue to be introduced incrementally through the [Dango Linear project](https://linear.app/leapstark/project/dango-edaa39ba53b2).

### AI generation pipeline

The core mining feature — turning a captured word/expression into reviewable bilingual sentence-mining material — is implemented and has been evaluated empirically, not just built and shipped on faith:

- **Prompt A/B testing against production.** `apps/web/scripts/benchmark-generation-prompts.ts` runs an LLM-as-judge harness: it generates output with `openai/gpt-5-mini` for a fixed set of fixtures (including a held-out set never used while writing the prompt), scores every output with an independent judge model (`anthropic/claude-sonnet-4.6`) on a rubric, and reports quality, latency percentiles, and token usage per prompt candidate. A real run (`prompt-benchmark-2026-08-13T23-57-17.419Z.json`) measured:

  | Candidate | Quality (holdout) | p50 latency | p95 latency | Failures |
  |---|---|---|---|---|
  | `production-v3` | **91.3** | 11.2s | 15.1s | 9 |
  | `typed-zero-shot` | 73.5 | 14.2s | 21.4s | 14 |
  | `lean-universal` | 18.9 | 12.7s | 16.7s | 39 |

  This is why `production-v3` is the shipped prompt (`generation-prompt.ts`) — it was the measured winner, not a guess.
- **Latency and fallback probing.** `probe-latency.ts` compares reasoning-effort settings on the primary model and a configured fallback model/provider under the real AI gateway.
- **Live prompt regression checks.** `probe-prompt-ab.ts` and `probe-quality.ts` run the current production prompt against real captures through the AI gateway for spot-checking before a prompt change ships.
- **Cost visibility.** `generation-telemetry.ts` pulls the actual reported cost per generation from the AI gateway, not an estimate.
- Unit tests (`generation-prompt.test.ts`, `sentence-generator.test.ts`, `generations.test.ts`) cover prompt construction and bounded-concurrency generation batching.

### Offline-first Anki delivery

`apps/desktop/src/modules/anki/sync.ts` (tested in `sync.test.ts`) synchronizes approved cards from the backend into a local delivery queue and back: it persists each delivery attempt locally before acknowledging it remotely, and — proven by a test that forces the remote `listRemote` call to fail — continues processing the durable local queue and reports accurate state even while the backend is unreachable. Native delivery to Anki, local TTS audio generation, and local queue persistence are implemented in Rust (`apps/desktop/src-tauri/src/anki_delivery/{anki,card,gtts,store}.rs`), with session restore from the macOS Keychain in `auth_keychain.rs`.

### What is not built yet

Per `PRODUCT.md`: the installable mobile PWA for on-the-go capture, daily-goal tracking, calendar view, and reminders are not implemented. The product today is the desktop capture-and-review loop described above; the mining-routine habit features are still ahead.

## Planned structure

```text
apps/
  desktop/      Tauri 2 desktop app with React and TypeScript
  web/          Next.js backend and future installable PWA
packages/
  domain/       Shared domain schemas and state transitions
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
4. Run the API with `pnpm --filter @dango/web dev`.
5. Run the native desktop with `pnpm dev:desktop`.

Use `pnpm check` and `pnpm test` to verify the complete workspace. Backend integration tests require Docker.
