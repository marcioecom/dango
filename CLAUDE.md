# Agent Instructions

Read these sources before changing code, in this order:

1. The assigned Linear issue and its blockers.
2. `SPEC.md` for accepted behavior and scope.
3. `PRODUCT.md` for product and interaction principles.
4. Relevant records in `docs/adr/` for architecture decisions.

## Working rules

- Use pnpm for Node.js dependencies and scripts.
- Implement the assigned issue as a narrow vertical slice with working behavior and tests.
- Do not build unrelated future packages or abstractions speculatively.
- Keep user data isolated by account in every remote query and mutation.
- Keep provider credentials out of desktop and browser bundles.
- Preserve offline captures and completed review decisions across failures.
- Make network and Anki delivery operations idempotent.
- Keep all user-facing copy localized in Brazilian Portuguese and English.
- Maintain keyboard accessibility and system light/dark theme support.
- Record a new ADR when an implementation requires changing an accepted architectural decision.

## TypeScript organization

- Follow the feature-module organization established in the Echo reference project.
- Use React Query for remote server state, React Hook Form with Zod for forms, and the Better Auth `authClient` for Better Auth endpoints.
- Keep custom HTTP and WebSocket transport adapters separate from feature hooks for routes not owned by Better Auth.

## Feature module convention (apps/web)

Each feature lives in `apps/web/modules/<feature>/` and is the only place that feature's code may live. Reference example: `modules/mining/`.

**Layers inside a module** (each exists only when needed):

- `ui/views/<name>-view.tsx`: composition roots for pages. The only UI files allowed to call data hooks. Pages under `app/` stay thin: session guard plus rendering a view.
- `ui/components/<name>.tsx`: presentational components. No fetching, mutations, or form state; receive data and callbacks via props.
- `hooks/`: all client logic - React Query hooks, form hooks (React Hook Form + Zod), and the HTTP transport adapter (`api.ts`). Query keys are centralized in `query-keys.ts` with hierarchical keys.
- `server/`: backend use cases called by API routes (Drizzle transactions, idempotency checks). API routes under `app/api/` stay thin and only call these use cases.
- `types.ts`: UI-level types shared across the feature's files. Do not export shared types from inside hooks.

**Sub-features**: when a module grows to cover several distinct flows, split it into sub-feature folders that mirror the same layered structure, plus a `shared/` folder for what 2+ sub-features use:

```
modules/<feature>/
├── shared/
│   ├── hooks/          # transport adapter, query keys, cross-feature hooks
│   └── server/         # shared use cases and error helpers
├── <sub-feature>/
│   ├── hooks/
│   ├── types.ts        # only when needed
│   └── ui/{components,views}
└── server/
    └── <sub-feature>/  # use cases grouped by sub-feature
```

**Cross-feature imports**: a sub-feature may import from another sub-feature's public layer (views, hooks, types) when one flow genuinely builds on another (example: `mining/session` renders `mining/review`'s view). Never reach into `ui/components` of another sub-feature; compose at the view level or move the piece to `shared/`.

**Style rules**:

- kebab-case file names; hooks `use-<name>.ts`; views `<name>-view.tsx`.
- Named exports only; component name matches the file name.
- No barrel files (`index.ts`). Import files directly.
- Relative imports inside a module; the `@/` alias from `app/` routes and between modules.
- App-wide shell pieces (navigation, providers) live in `modules/shell/`, not inside a feature module.

## Repository state

This repository currently contains an empty scaffold. Create each application or shared package when the first assigned vertical slice requires it. Empty package directories communicate the intended boundaries, not a requirement to fill every package immediately.

The predecessor Python CLI lives in a separate repository and may be read as behavioral reference. Do not modify it as part of this project unless explicitly requested.
