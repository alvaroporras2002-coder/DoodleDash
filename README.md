# DoodleOnline

An independent online drawing playground for 2–20 people. Write a prompt, pass it on, draw, guess, and reveal a shared collection of unexpected stories.

## Visual identity
Charcoal surfaces, clean neutral typography, an original abstract-stroke logo and restrained violet/green accents. The home page offers Create room and Join room; modes are chosen inside the lobby. Cameras sit alongside the game on desktop and below it on mobile. All player-facing copy is in English.

## Play
- Guest nickname and avatar; no email or password.
- Seven modes: Drawing Telephone, Quick Sketch, Masterpiece, From Memory, In Motion, Creative Copy and Icebreaker.
- Private invitations, ready checks, server-owned rounds, reveal timelines, replay and downloads.
- Canvas with drawing tools, undo, redo, shapes, fill and local drafts.
- Private server autosave for drawings and phrases, used automatically at timeout without pressing Submit. Requires migration 202611110006_autosave.sql.
- Optional LiveKit camera and microphone, off until the player chooses otherwise.
- Responsive layouts, keyboard controls and reduced-motion support.

## Development
```sh
npm install
npm run dev
npm run build
npm test
npm run check:video
npm run test:video
```

Production: build `npm run build`, output `dist`, with the root `functions/` directory included by Cloudflare Pages.

Use `.env.example`, [setup documentation](docs/SETUP.md), and [video documentation](docs/VIDEO.md) for service configuration. Keep LiveKit credentials server-only. Apply the existing SQL migrations in order when setting up a new database.

## Rebrand deployment
This is a frontend identity update. Existing rooms, drawing drafts and service bindings remain compatible. The identity itself needs no SQL; apply migration 202611110006_autosave.sql for the automatic round-save feature. No new secrets are required. Historical storage keys and media-room identifiers are deliberately retained to avoid breaking ongoing games.

See [deployment notes](docs/REBRAND.md) for the separate hosting-address change. Advertising is not enabled by this rebrand.
