# ADR 0003: Shared UI foundation

## Status

Accepted

## Context

The desktop app currently uses a local `App.css`, while the web app uses an independent `globals.css`. The two frontends need the same Dango identity, semantic states, accessibility behavior, and system light/dark themes. ADR 0001 allows a shared UI package once components are proven useful in both desktop and PWA.

Copying CSS and components between apps would let the token sets drift. Sharing complete screens would instead couple Next.js and Tauri workflows that have different scope, persistence, navigation, and platform behavior.

## Decision

- Create `packages/ui` as `@dango/ui`.
- Use Tailwind CSS v4 for utility styling and CSS-first design tokens.
- Use shadcn as the source pattern for accessible primitives, not as a complete visual identity.
- Keep the global token sheet, Tailwind source registration, brand mark, utility helpers, and cross-platform primitives in `@dango/ui`.
- Export components through explicit package subpaths so both Vite and Next.js consume source modules consistently.
- Keep feature views, translations, routing, server state, Tauri integration, and domain behavior in each app.
- Follow the system light/dark preference by default and provide equivalent semantic tokens for both themes.
- Preserve persisted native identifiers during the visual rebrand until a migration is explicitly designed.

## Consequences

- Desktop and PWA share one visual vocabulary and token source.
- Each app needs a Tailwind-compatible build integration.
- A primitive enters the package only when both frontends use it or when it is part of the foundational brand vocabulary.
- Updating a shared primitive can affect both apps and therefore requires cross-app checks.
- The Dango product name and JavaScript package scopes can change without invalidating existing Keychain sessions.

## Alternatives considered

### Independent Tailwind configurations

Rejected because duplicated semantic tokens and shadcn components would drift while pretending to be a shared design system.

### Share complete feature screens

Rejected because desktop mining and mobile capture have different responsibilities and platform dependencies.

### Keep handwritten global CSS

Rejected because it preserves two styling systems and makes component state consistency harder to enforce.
