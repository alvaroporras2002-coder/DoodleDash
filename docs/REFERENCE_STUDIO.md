# DoodleOnline reference studio

This iteration follows the selected charcoal / lavender / lime identity board.

The master mark is the open ribbon path in `src/components/Brand.tsx`, mirrored in `public/brand-mark.svg` and `public/favicon.svg`. The wordmark uses Inter 750 as a single lowercase name. Shared UI tokens live in `src/styles.css`:

| Role | HEX |
|---|---|
| Background | #141518 |
| Panel | #1C1E22 |
| Raised controls | #26282F |
| Text | #F1F2F5 |
| Secondary text | #A5A7B2 |
| Violet | #A780F5 |
| Lime | #B9E98C |

The home offers stacked Create room / Join room buttons and a restrained green practice link. Game modes remain inside the lobby. A desktop round keeps the roster and optional call beside a white drawing surface; mobile moves the call and roster below the task. The actual canvas precedes the toolbar in both visual and DOM order.

Drawings and camera portraits in the concept are examples of live content, not decorative UI assets. The game does not insert them, and it does not imitate a browser frame or phone status bar. Camera and microphone access remain optional and off until the player chooses them.

This visual change needs no Supabase migration, LiveKit credential changes or Cloudflare environment changes. After merging to main, the existing Cloudflare integration builds the updated app. See `design-qa.md` for local verification limitations and the preview checklist.
