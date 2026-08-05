# Dango Design System

## Direction

Dango is a focused sentence-mining tool, not a gamified language app. Its visual language combines the functional precision of Raycast and Things, the material restraint of Muji, and the measured color relationships of contemporary wagashi.

The Japanese reference remains subtle. It appears through proportion, spacing, color, and the three-part Dango mark. The interface does not use kawaii illustration, decorative chopsticks, faux paper textures, or ornamental Japanese typography.

## Experience Scene

On desktop, a learner works through a short review session at home under variable ambient light. On iPhone, the same learner captures a word in seconds while reading or watching something. Both surfaces follow the system theme so controls remain legible without forcing a mode switch.

## Color Strategy

The product uses a restrained palette:

- `yomogi`: primary actions, current selection, focus, and positive progress.
- `azuki`: brand signature and rare emphasis. It is not a second general-purpose action color.
- Neutral surfaces: near-achromatic values tinted slightly toward yomogi, never cream, sand, or parchment.
- Semantic colors: destructive, warning, success, and information remain distinct from brand roles.

All tokens use OKLCH. Body and placeholder text meet WCAG AA contrast. Meaning is never communicated by color alone.

## Typography

- Use one humanist sans-serif family across headings, body, controls, and data.
- Prefer the platform-aware Inter stack for consistent webview and browser rendering.
- Product headings use a fixed rem scale and no tighter than `-0.04em` letter spacing.
- Prose is capped at 65-75 characters; compact interface data may run wider.
- Buttons, labels, and status text never use display typography or decorative tracking.

## Shape And Depth

- Base radius: 10px. Cards and panels remain within 12-16px.
- Use spacing, background layers, and one-pixel dividers before adding containers.
- Do not pair decorative borders with wide soft shadows.
- Pills are reserved for tags, compact status, and segmented controls.
- Avoid nested cards and identical card grids.

## Components

Every interactive component includes default, hover, focus-visible, active, disabled, loading, and invalid states where applicable. Skeletons represent content loading. Empty states explain the next useful action.

The shared vocabulary includes buttons, inputs, labels, selects, feedback messages, skeletons, the Dango mark, and future primitives proven useful in both apps. Domain compositions such as capture, review, and Anki delivery remain inside their feature modules.

## Layout

Desktop layouts prioritize the current task with stable navigation and moderate density. PWA layouts use a single primary column and touch targets of at least 44px. Responsive changes are structural rather than fluid type scaling.

Each screen has one dominant action. Synchronization, account, and Anki states remain visible but secondary unless they block the task.

## Motion

- State transitions run between 150ms and 250ms with ease-out curves.
- Motion communicates selection, progress, loading, or completion only.
- Page-load choreography and decorative loops are prohibited.
- Reduced-motion preferences collapse transitions to an effectively instant state change.

## Architecture

`packages/ui` owns shared Tailwind CSS, design tokens, the shadcn configuration, framework-neutral primitives, and brand assets. It must not import Next.js, Tauri, i18n, authentication, data fetching, or product-domain code.

`apps/web` and `apps/desktop` import the shared stylesheet and compose primitives inside local feature modules. App-specific layout and behavior stay local even when both apps use React.

## Brand Mark

The Dango mark uses three aligned circular forms and a restrained skewer gesture. It must remain recognizable at 16px, work in one color, and avoid facial features or illustrative detail. The wordmark uses the product sans with ordinary title case.

The app icon places the full-color mark on a restrained deep-yomogi gradient, moving from `oklch(0.30 0.055 130)` at the lower left to `oklch(0.16 0.012 130)` at the upper right. This keeps the white skewer and all three pieces legible across Dock materials without defaulting to pure black.
