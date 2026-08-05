# ADR 0002: Desktop authentication

## Status

Accepted

## Context

The macOS desktop is a native client of the shared Next.js backend. Browser cookies inside the webview would couple the session to webview storage and would not satisfy the requirement to keep desktop session secrets in the macOS Keychain. The first private beta also needs email ownership verification, a server-side allowlist, session restoration after process restarts, and remote logout.

The product currently has no deep-link protocol. Adding one only to return from email verification would expand the native surface before another workflow needs it.

## Decision

- Better Auth owns email-and-password accounts, verification records, and server sessions in Postgres.
- A server-side allowlist intercepts email sign-up before any user or account record is created.
- Resend sends verification links. Verification finishes on a small web page, and the user returns to the desktop manually.
- The Better Auth bearer plugin provides a signed native-client session token.
- The React process keeps the active token only in memory.
- Three narrowly scoped Tauri commands save, load, and delete one session token in the macOS Keychain under the application bundle identifier.
- On launch, the desktop loads the token and validates it through an authenticated identity endpoint. An invalid or revoked token is deleted; a network failure preserves it for retry.
- Logout revokes the server session before deleting the Keychain entry. A failed remote revocation leaves the local session intact and visible to the user.
- Desktop requests use an explicit origin allowlist and CORS exposes only the Better Auth session response header required by the native client.

## Consequences

- Restarting the desktop does not require entering credentials while the server session remains valid.
- Copying webview storage or application files does not reveal the persisted bearer token.
- Logout requires backend connectivity to guarantee both remote and local revocation.
- The verification flow temporarily moves the user to their browser, but avoids introducing deep-link lifecycle and protocol handling in this slice.
- Future authenticated API routes must derive user identity from the validated server session, never from a client-provided user identifier.
- The future PWA can use Better Auth browser cookies without changing the desktop strategy.

## Alternatives considered

### Webview cookies

Rejected because cookie persistence belongs to the webview rather than the native Keychain boundary selected in ADR 0001.

### Local storage

Rejected because it is readable by webview JavaScript and is not an operating-system credential store.

### Deep link after verification

Deferred because manual return completes the current private flow with less native protocol surface. A later workflow may justify a shared deep-link design.

### Pre-created accounts

Rejected for this slice because the accepted product behavior requires an allowed user to create and verify their own account.
