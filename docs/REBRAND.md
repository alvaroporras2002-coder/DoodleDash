# DoodleOnline deployment notes

## Publish the visual redesign
Merge the DoodleOnline pull request. The connected Cloudflare Pages project builds and deploys main automatically. Refresh the site after the deployment succeeds.

No new database migration, API key, LiveKit project or environment variable is required. Guest sessions, invitations, current rooms, and stored drawing drafts remain compatible.

## Hosting address
Changing the on-page brand and metadata does not change the existing pages.dev hostname or repository name. To use a DoodleOnline address, either attach a domain you control or create a separately named Cloudflare Pages project if that project name is available.

For a new Pages project, connect this same repository and main branch, use npm run build and dist, and copy the existing Production variables through Cloudflare directly:
- VITE_SUPABASE_URL (Text)
- VITE_SUPABASE_ANON_KEY (Text)
- LIVEKIT_URL (Text)
- LIVEKIT_API_KEY (Secret)
- LIVEKIT_API_SECRET (Secret)
- VIDEO_ENABLED (Text, true)

Keep secrets out of GitHub and chat. Verify the new deployment and optional call before moving players to the new address. The existing deployment stays available during the transition.

Internal storage prefixes and server room names retain their previous values for compatibility; they are not part of the player-facing brand.

## Advertising
No ad script, publisher ID, ads.txt file, consent claim or approval claim is introduced by this change. Advertising setup and review are separate from visual design.
