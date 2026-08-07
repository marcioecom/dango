# ADR 0005: PWA-first mining

## Status

Accepted

Supersedes the initial mobile-scope portions of ADR 0001 and ADR 0003.

## Context

The original delivery order put the complete macOS workflow before the iPhone PWA and limited mobile behavior to capture. The immediate user need is to collect words while watching media and, when convenient, generate and approve the final sentence on the same device. Waiting for desktop-local persistence, TTS, and AnkiConnect delays that useful workflow even though generation and review already belong to the shared backend domain.

The first PWA delivery is intentionally online. Offline IndexedDB capture remains required, but follows after the online vertical slice is validated.

## Decision

- The first usable client is an installable iPhone PWA.
- The PWA supports authenticated online capture, inbox browsing, AI generation, review, sentence editing, and explicit approval.
- Postgres remains authoritative for captures, generations, choices, and approved content.
- An approved capture remains in the remote `approved` state until a desktop creates a durable local Anki delivery. Approval does not imply that an Anki outbox already exists.
- TTS, Anki configuration, AnkiConnect, media storage, and delivery retries remain desktop-only responsibilities.
- The backend derives ownership from the validated Better Auth session for every operation.
- The PWA initially assumes an existing verified account. Account creation and password recovery are not part of this slice.
- Offline PWA capture and synchronization are a subsequent vertical slice using the same client-generated identifiers and idempotent mutation contracts.

## Consequences

- The backend capture and generation contracts are implemented before desktop synchronization.
- The future desktop can consume the same remote `approved` records without re-running review.
- Mobile generation increases the importance of server-side usage accounting, rate limits, and idempotent retries.
- The PWA needs feature-local review UI instead of sharing a complete desktop mining screen.
- Installation alone does not imply offline capture support in the first delivery; network failures must be communicated without claiming that unsaved content is durable.

## Alternatives considered

### Complete the desktop first

Rejected because local persistence, TTS, AnkiConnect, and distribution are not prerequisites for useful capture and human review.

### Keep the PWA capture-only

Rejected because it leaves the time-sensitive generation and sentence-choice work for a later desktop session, which does not meet the immediate workflow.

### Mark approval as pending Anki immediately

Rejected because the Anki outbox is device-local. A remote item cannot truthfully be pending in a durable desktop delivery before a desktop has synchronized it.
