# Reference studio design QA

Source visual: user-supplied `image(20261111-204816).png`, 729 × 457 pixels. It is a combined identity board with a framed desktop drawing round and a mobile home, not a full-size production screenshot. Browser and phone chrome are not application UI.

## Scope

- Open lavender ribbon mark, two lime strokes and a unified lowercase Inter wordmark.
- Charcoal surfaces, white task paper, thin borders, compact controls and a round countdown.
- Stacked Create room / Join room actions and a green practice link.
- Desktop roster / canvas / optional call layout; mobile task first, call below.
- Existing guest sessions, room actions, autosave and media consent behavior retained.

## Evidence and checks

- Source image opened and inspected.
- The vector logo was rendered and inspected independently. This verifies the asset only, not the application layout.
- Changed TSX was parsed with Playwright's bundled Babel parser. This is syntax validation, not TypeScript or application build validation.
- Existing configured-entry browser coverage extends to 1440, 1024, 768, 390 and 320 CSS pixels. It checks canvas/tool order, overflow, lateral/below call position and zero device requests before opting in.
- The existing CI workflow runs the production build, server checks and browser regressions.

## Required fidelity surfaces

| Surface | Implementation | Verification gap |
|---|---|---|
| Typography | Inter; bold unified wordmark and compact white headline | Font loading and exact rendered metrics need browser review |
| Layout and spacing | Smaller header, framed studio, narrow roster/call panels, tools below paper | No application screenshot available locally |
| Colors | Background #141518, raised #26282F, violet #A780F5, green #B9E98C | Full component contrast/visual inspection still pending |
| Images and logo | Shared vector mark/favicon; real drawings and camera streams remain dynamic | No staged or fake people/content inserted |
| Copy | English; existing functional labels and autosave messages preserved | Live interaction review still pending |

## Blockers

Local dependency installation returned HTTP 403 for `@livekit/components-react`. Chromium failed before page startup with `socket() failed: Operation not permitted (1)` in `process_singleton_posix.cc`. No application viewport, console inspection, same-state screenshot comparison or interaction test could be completed in this environment. No density-normalized visual comparison is claimed.

Implementation screenshot: unavailable. CSS targets: 1440 × 1000, 1024 × 1000, 768 × 1000, 390 × 1000 and 320 × 1000, expected device scale factor 1 in automated tests. Source device/browser frames would need to be cropped and normalized before comparison.

## Review checklist

1. Confirm GitHub CI passes for the exact PR commit.
2. Open the Cloudflare preview on desktop and mobile.
3. Inspect home/create/join and a real drawing round at the listed widths.
4. Draw, undo, autosave, submit and reveal; confirm the reordered toolbar does not regress input.
5. Join the optional call, enable audio/camera explicitly and check controls at narrow widths.
6. Compare source/app content regions at matching sizes, then record visual findings and any fixes.

final result: blocked
