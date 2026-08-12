# Dango desktop

Tauri 2 desktop application for macOS. React owns the authentication interface and Rust persists one signed Better Auth session token in the macOS Keychain.

## Development

Configure `VITE_API_URL` as described in `.env.example`, start the web API, then run:

```bash
pnpm dev:desktop
```

Development uses the local URL from `.env`. Production builds use the deployed URL from `.env.production`:

```bash
pnpm --filter @dango/desktop bundle:production
```

Production uses `https://dango.marcio.run` as its stable API and email-verification origin. Configure the web deployment with:

```env
BETTER_AUTH_URL=https://dango.marcio.run
AUTH_TRUSTED_ORIGINS=tauri://localhost
```

Redeploy the web application after changing these values, then build the DMG. The desktop sends relative email-verification callbacks so verification stays on this canonical domain.

Desktop API calls use Tauri's native HTTP client. Its capability is restricted to the local development API and the canonical production domain, avoiding WKWebView transport differences in installed macOS bundles.

The production build fails before compiling Rust unless Vite resolves `VITE_API_URL` to the canonical domain.

## Verification

```bash
pnpm --filter @dango/desktop check
pnpm --filter @dango/desktop test
```
