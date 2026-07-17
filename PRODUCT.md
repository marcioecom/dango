# Product

## Register

product

## Purpose

Anki Miner helps English learners turn words, expressions, and original sentences found during immersion into reviewed Anki cards with minimal repetitive work. It combines fast capture, AI-assisted sentence generation, text-to-speech audio, and reliable delivery to a local Anki installation.

The product also supports a consistent mining routine through small daily goals, resumable sessions, and reminders that only appear when work is pending.

## Users

The initial product is private and serves two independent users following the Mairo Vergara sentence-mining method.

Each user has their own:

- Account and inbox.
- Mining history and daily goal.
- Anki deck, note type, and field mapping.
- Reminder preferences.
- AI usage allowance.

There are no shared queues or shared progress.

## Core workflow

1. Capture a word or expression, optionally with its original sentence and source.
2. Keep the capture in an inbox until a mining session starts.
3. Generate a Portuguese explanation, translation, and five English example sentences.
4. Review the original sentence and generated alternatives.
5. Select or edit one sentence and explicitly approve it.
6. Generate and preview its English audio.
7. Deliver the card to the user's local Anki through AnkiConnect.
8. Retry safely if Anki is closed or unavailable.

## Product principles

1. Capture and mining are separate activities.
2. A card is never created without explicit human review.
3. Decisions are fast, reversible, and saved immediately.
4. Technical failures must not erase captures or completed review work.
5. Defaults accelerate the common path while keyboard actions remain discoverable.
6. The interface is utilitarian, reliable, and direct.
7. Habit support stays lightweight: daily goal, clear progress, calendar, and useful reminders.
8. Desktop and mobile capture work offline and synchronize later.

## Experience direction

- Interface language: Brazilian Portuguese.
- Appearance: follow the system light or dark theme.
- Desktop home: a focused `Hoje` view with progress, pending work, Anki state, and one primary action.
- Desktop capture: main application window for the initial release.
- Mobile capture: installable PWA opened from the iPhone home screen.
- Motion communicates state and never delays the task.
- Errors explain what happened and what the user can do next.

## Card format

- Front: selected English sentence with the target expression emphasized and attached audio.
- Back: target expression and Portuguese translation.
- The Portuguese explanation supports review but is not stored in the card.
- If a valid original sentence was captured, it appears alongside the five generated alternatives.

## Anti-references

- Automatic card creation without review.
- Heavy analytics dashboards or decorative gamification.
- Notifications when the inbox is empty or the daily goal is complete.
- Requiring Anki to be open before a mining session can start.
- Requiring direct device-to-device pairing between iPhone and Mac.
- Exposing provider credentials in desktop or browser clients.
- Maintaining AwesomeTTS as a required dependency.
