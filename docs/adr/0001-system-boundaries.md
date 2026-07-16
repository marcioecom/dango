# ADR 0001: System boundaries

## Status

Accepted

## Context

The predecessor is a synchronous Python CLI that performs capture, AI generation, TTS, review, and AnkiConnect delivery on one computer. The new product must support a macOS interface, offline capture, a second user, future iPhone capture, protected AI credentials, and reliable Anki delivery when Anki is temporarily unavailable.

A direct mobile-to-desktop relay would require device discovery, pairing, availability, and conflict handling. Calling providers from a Tauri webview or PWA would expose credentials. Bundling Python as a sidecar would retain packaging and runtime complexity despite the small domain surface that needs migration.

## Decision

Use a pnpm monorepo with these boundaries:

- `apps/desktop`: Tauri 2 with React, TypeScript, and Vite. Rust owns native macOS capabilities, SQLite, Keychain, notifications, and AnkiConnect.
- `apps/web`: Next.js deployed to Vercel. It owns the authenticated API and later serves the installable PWA.
- Postgres is the remote source of truth for synchronized user data.
- SQLite and IndexedDB provide local-first capture and durable client outboxes.
- Better Auth provides private email-and-password accounts restricted by a server allowlist.
- Vercel AI Gateway is called only by the backend.
- The desktop communicates with AnkiConnect only through Tauri native commands.
- Mobile capture synchronizes through the backend and does not pair directly with the desktop.
- The Python implementation is rewritten rather than bundled as a sidecar.

Shared packages are introduced only when used:

- `packages/domain`: schemas and pure domain transitions shared across runtimes.
- `packages/api-client`: typed API and synchronization protocol.
- `packages/ui`: components proven useful in both desktop and PWA.

## Consequences

- Captures can be made while the Mac or backend is unavailable and synchronize later.
- AI keys remain on the server, and usage can be isolated and limited per user.
- Anki remains a local desktop integration and never needs to expose AnkiConnect over the internet.
- The system must reconcile cloud state with SQLite and IndexedDB outboxes.
- Desktop authentication needs an explicit native-client session strategy and Keychain storage.
- Some UI code may initially be duplicated rather than forcing a premature shared UI package.
- Private macOS distribution can use an unsigned manual package, while iPhone capture avoids paid Apple distribution through a PWA.

## Alternatives considered

### Python sidecar

Rejected because packaging Python and its dependencies would add distribution complexity and preserve synchronous orchestration that needs redesign.

### Direct Tauri webview access to AnkiConnect

Rejected because native commands provide a clearer security boundary and avoid webview origin and CORS configuration.

### Native iOS or Tauri Mobile client

Deferred because distribution through TestFlight requires paid Apple Developer membership and the initial mobile scope only needs capture.

### Peer-to-peer iPhone-to-Mac relay

Rejected because it requires the Mac to be reachable and introduces pairing and delivery reliability problems already solved by the shared backend.
