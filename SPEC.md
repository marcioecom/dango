# Dango Specification

## Status

Baseline specification approved from the migration planning conversation. Implementation is tracked in the [Dango Linear project](https://linear.app/leapstark/project/dango-edaa39ba53b2).

## Scope

Dango is a new project replacing the daily workflow of the Python `anki-automator` CLI. The first usable delivery is an installable iPhone PWA plus a shared backend for online capture, AI generation, review, and approval. The macOS desktop follows as the device-local bridge that generates audio locally and delivers cards to Anki.

The existing Python repository remains unchanged as reference and fallback. This repository does not need to preserve its internal architecture or file formats beyond the explicit pending-item import.

## Target platforms

- First desktop platform: macOS.
- First client platform: iPhone through a PWA.
- Initial distribution: private, for two users.
- Paid Apple Developer membership, TestFlight, App Store, Windows, Linux, and native iOS are outside the initial scope.

## System context

```text
Tauri desktop
  |-- HTTPS --> Next.js API on Vercel
  |                 |-- Better Auth
  |                 |-- Postgres
  |                 `-- Vercel AI Gateway
  |
  |-- HTTPS --> Google Translate text-to-speech
  |
  `-- local Rust commands --> AnkiConnect at 127.0.0.1:8765

iPhone PWA
  `-- HTTPS --> the same Next.js API
```

The backend is authoritative for synchronized captures, generation records, choices, history, goals, and usage. Desktop SQLite and PWA IndexedDB provide immediate local state, offline capture, and durable outboxes.

## Domain vocabulary

### Capture

A word or expression saved by a user. It has required text and optional original sentence and source. It receives a client-generated stable identifier before any network request.

### Inbox

The user's captures that remain available for future mining.

### Generation

One versioned AI result for a capture. It records explanation, translation, five alternatives, model, prompt version, usage, latency, and errors.

### Mining session

A bounded sequence of inbox items selected for review. Its suggested size is the number of approvals still needed to meet the user's daily goal.

### Approved card

A reviewed capture with a selected or edited sentence. Approval counts toward the daily goal even when delivery to Anki is still pending.

### Anki delivery

A device-local attempt to turn an approved card into an Anki note. Deliveries are durable and idempotent.

### Deferred capture

A capture removed from the current session but kept in the inbox for a future session.

### Discarded capture

An archived capture that no longer appears in normal sessions and does not count toward the daily goal.

## State model

The persisted business state follows these transitions:

```text
inbox
  -> generating
  -> ready_for_review
  -> approved
  -> pending_anki
  -> sent_to_anki

inbox | ready_for_review -> deferred -> inbox
inbox | ready_for_review -> discarded
```

Generation attempts and Anki deliveries are separate records from the capture. A failed external operation must not corrupt or erase the capture's last valid business state.

## Functional requirements

### Accounts and isolation

- `AUTH-01`: Only emails in a server-side allowlist can register.
- `AUTH-02`: Email and password authentication includes email verification and password recovery.
- `AUTH-03`: Desktop credentials or session tokens are stored in the macOS Keychain.
- `AUTH-04`: Every remote query and mutation is scoped to the authenticated user.
- `AUTH-05`: The two users cannot see or affect each other's captures, settings, history, usage, or Anki configuration.

### Capture and synchronization

- `CAP-01`: Capture requires text and accepts an optional original sentence and source.
- `CAP-02`: Desktop and PWA save locally before remote confirmation.
- `CAP-03`: Client-generated identifiers make mutation retries idempotent.
- `CAP-04`: Pending captures survive application restart and synchronize after reconnection.
- `CAP-05`: Equivalent normalized text produces a duplicate warning, not a hard block.
- `CAP-06`: A user can intentionally capture the same expression in a different context.
- `CAP-07`: Sync conflicts never silently overwrite a reviewed or approved state.

### AI generation

- `AI-01`: All model requests run on the backend through Vercel AI Gateway.
- `AI-02`: Users cannot select models in the initial UI.
- `AI-03`: The backend controls the default model and fallback without requiring an app update.
- `AI-04`: Structured output contains a Portuguese explanation, Portuguese translation, and exactly five English example sentences.
- `AI-05`: Generation records include model and prompt versions so old results are never mistaken for current cache entries.
- `AI-06`: Per-user limits are based on measured benchmark cost and are configurable on the server.
- `AI-07`: Invalid output or provider failure leaves the capture recoverable.

### Review and sessions

- `REV-01`: A valid original sentence appears as a distinct option alongside the five generated alternatives.
- `REV-02`: The user can select or edit a sentence before approval.
- `REV-03`: No Anki delivery exists before explicit approval.
- `REV-04`: The user can defer or discard, with different persistent effects.
- `REV-05`: Each decision is saved immediately.
- `REV-06`: Interrupted sessions resume without repeating completed decisions.
- `REV-07`: The session defaults to the amount remaining in the daily goal and can be adjusted before starting.

### Text-to-speech

- `TTS-01`: The provider is selected after a measured comparison with the current gTTS output.
- `TTS-02`: The desktop generates the English MP3 locally and attaches it automatically without requiring a preview step.
- `TTS-03`: Audio is never sent through the backend and remains in durable device-local storage only until Anki confirms the delivery.
- `TTS-04`: Failed audio generation can be retried without repeating sentence review.
- `TTS-05`: AwesomeTTS is not required.

### Anki integration

- `ANKI-01`: Only the Tauri native layer communicates with local AnkiConnect.
- `ANKI-02`: Each desktop profile configures deck, note type, front field, and back field.
- `ANKI-03`: Defaults are English::Mining, Basic, Front, and Back when available.
- `ANKI-04`: The selected Anki model is validated before real delivery.
- `ANKI-05`: Approved cards enter a local outbox when Anki is closed or unavailable.
- `ANKI-06`: Each note receives a stable tag derived from the capture identifier.
- `ANKI-07`: Retrying an uncertain delivery locates and updates the tagged note instead of creating a duplicate.
- `ANKI-08`: User and model text is escaped before card HTML is generated.

### Daily routine

- `HABIT-01`: Approval counts toward the daily goal before Anki delivery completes.
- `HABIT-02`: The Hoje screen shows daily progress, inbox depth, pending deliveries, Anki state, and one primary action.
- `HABIT-03`: The consistency calendar distinguishes complete, partial, and inactive days without relying only on color.
- `HABIT-04`: A daily reminder fires only when actionable inbox work remains.
- `HABIT-05`: The notification can start the suggested session or defer the reminder.
- `HABIT-06`: The desktop can optionally launch with macOS and remain in the menu bar.

### PWA

- `PWA-01`: The PWA is installable from Safari and optimized for the target iPhone.
- `PWA-02`: Its first delivery supports online capture, inbox browsing, generation, review, editing, and explicit approval.
- `PWA-03`: Offline captures persist in IndexedDB and synchronize later, after the first online delivery is validated.
- `PWA-04`: TTS and Anki delivery remain desktop-only workflows.
- `PWA-05`: An approved capture remains authoritative in the backend until a desktop creates its durable local Anki delivery.

### Migration

- `MIG-01`: The desktop can import pending entries from the legacy inbox and selected numbered files.
- `MIG-02`: Import shows valid, invalid, and duplicate entries before confirmation.
- `MIG-03`: Legacy checkpoints, generation cache, processed history, and existing Anki cards are not imported.

## Data ownership

Cloud history retains captures, generations, selected sentences, decisions, and synchronization state per user. Generated MP3 files never transit or persist in the cloud.

Anki configuration, Anki note identifiers, audio files awaiting delivery, and the Anki outbox are device-local. A stable capture tag provides delivery idempotency if local confirmation is interrupted.

## Security requirements

- Provider credentials and auth secrets exist only in server environments.
- Production uses HTTPS, secure cookies where applicable, explicit trusted origins, CSRF protection, origin checks, and persistent rate limiting.
- Desktop native sessions use the authentication mechanism selected for non-browser clients and store secrets in Keychain.
- Logs exclude API credentials and avoid unnecessary capture content.
- AI usage is attributed per user and retry-safe.

## Reliability requirements

- Capture must remain available without internet.
- Review decisions must survive process termination.
- Network and Anki retries must be idempotent.
- Local state must render before synchronization completes.
- Errors must distinguish offline, expired authentication, quota, provider failure, invalid Anki configuration, and unavailable AnkiConnect.

## UI requirements

- Brazilian Portuguese copy.
- System-controlled light and dark themes.
- Keyboard access for all mining-session decisions.
- Visible focus, disabled, loading, success, warning, and error states.
- No color-only meaning.
- Product motion is short, respects reduced motion, and communicates state only.

## Benchmarks before provider selection

The user will add a file with approximately 600 real entries. Select 10 representative entries spanning isolated words, expressions, phrasal verbs, original context, and difficult cases.

Model comparison measures structured-output validity, naturalness, correct target usage, human preference, latency, tokens, and provider-reported cost. TTS comparison measures human preference, latency, MP3 compatibility, file size, and provider-reported cost. Numerical limits must come from these measurements rather than estimates.

## Delivery milestones

1. Riscos validados: authentication, model, TTS, AnkiConnect, and notification tracer bullets.
2. Mineração PWA privada: installable PWA, online capture, inbox, generation, review, approval, and measured usage limits.
3. Captura local-first: IndexedDB and desktop outboxes, synchronization, and duplicate handling.
4. Entrega ao Anki: desktop configuration, audio, idempotent outbox, and recovery.
5. Rotina diária: Hoje, history, reminders, menu bar, and autostart.
6. Beta desktop privado: production operation, manual macOS distribution, migration, and two-user acceptance.

## Explicit non-goals

- Public registration or an administrative invitation UI.
- Shared inboxes, shared progress, or card exchange.
- Native iOS or Tauri Mobile application.
- TestFlight or App Store distribution.
- Windows or Linux support.
- Direct mobile-to-Anki delivery.
- Full card-template customization.
- Anki review or scheduling inside Dango.
- Global desktop capture shortcut in the first release.
- Levels, achievements, or heavy gamification.
- Maintaining the Python CLI as a second active implementation.

## Open inputs

- The default AI model is `openai/gpt-5-mini`, with `google/gemini-2.5-flash` as fallback, selected from the measured LEA-30 benchmark.
- The initial TTS provider is gTTS, selected from the measured LEA-29 audio comparison and called by the native desktop layer. On provider failure, preserve the approved review decision and local delivery, then retry gTTS. No cross-provider fallback is selected for the private beta because edge-tts returned HTTP 403 and macOS `say` was not selected.
- Daily generation limit and default daily goal remain intentionally unset until measured or chosen by the user.
