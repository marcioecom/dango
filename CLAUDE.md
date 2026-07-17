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
- Keep all user-facing copy in Brazilian Portuguese.
- Maintain keyboard accessibility and system light/dark theme support.
- Record a new ADR when an implementation requires changing an accepted architectural decision.

## Repository state

This repository currently contains an empty scaffold. Create each application or shared package when the first assigned vertical slice requires it. Empty package directories communicate the intended boundaries, not a requirement to fill every package immediately.

The predecessor Python CLI lives in a separate repository and may be read as behavioral reference. Do not modify it as part of this project unless explicitly requested.
