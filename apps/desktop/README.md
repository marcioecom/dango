# Anki Miner desktop

Tauri 2 desktop application for macOS. React owns the authentication interface and Rust persists one signed Better Auth session token in the macOS Keychain.

## Development

Configure `VITE_API_URL` as described in `.env.example`, start the web API, then run:

```bash
pnpm dev:desktop
```

The Content Security Policy currently allows the local API origin. Add the deployed API origin explicitly to `src-tauri/tauri.conf.json` when production deployment is introduced.

## Verification

```bash
pnpm --filter @anki-miner/desktop check
pnpm --filter @anki-miner/desktop test
```
