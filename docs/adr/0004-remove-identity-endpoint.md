# ADR 0004: Remove the identity endpoint

## Status

Accepted

## Context

The desktop authentication flow already stores the Better Auth bearer token and validates the session through `authClient.getSession()`. The separate `/api/me` endpoint duplicated that identity lookup and required a shared `api-client` package for a contract used only by the initial authentication spike.

## Decision

- Remove the `/api/me` endpoint and its route-specific tests.
- Keep session validation in the desktop through Better Auth's `getSession` operation.
- Keep the desktop `AuthenticatedUser` type in the desktop auth module until another runtime needs a shared domain contract.
- Do not maintain a shared API client package until the synchronization API has a concrete shared contract.

## Consequences

- The authentication vertical slice has one session lookup path.
- The desktop and web applications no longer depend on `packages/api-client`.
- A future synchronization API can introduce a focused shared client when its routes and data contracts are implemented.
- The accepted desktop authentication decision remains unchanged: the bearer token is validated by the server session and persisted only in the macOS Keychain.

## Alternatives considered

### Keep `/api/me` as a compatibility endpoint

Rejected because there is no current consumer distinct from Better Auth's session endpoint.

### Keep `packages/api-client` for the future synchronization API

Rejected because an empty or speculative client package adds workspace and contract maintenance before the synchronization API exists.
