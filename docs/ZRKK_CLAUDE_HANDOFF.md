# ZRKK 1M GAME — Claude handoff

## Goal

Continue development of the ZRKK real-time KPI, revenue mission, and team performance web app.

Live reference: https://zrkk-1m-game.haoabout.chatgpt.site/

## Stack

- TypeScript, React 19, Vinext/Vite
- Cloudflare Workers runtime
- Cloudflare D1 for persistent app state
- Drizzle schema/migration files

## Run locally

```bash
pnpm install
pnpm dev
```

Validation:

```bash
pnpm exec tsc --noEmit
node scripts/check-game.cjs
pnpm build
```

## Important files

- `app/dashboard-app.tsx` — main dashboard, missions, players, and autosave UI
- `app/game-details.tsx` — per-player KPI form
- `app/game-rules.ts` — role KPI templates and score calculations
- `app/access.ts` — manager/employee access rules
- `app/api/state/route.ts` — D1 state API and server-side write restrictions
- `app/api/me/route.ts` — current authenticated user access
- `app/staff-roster.ts` — default staff/role assignments
- `app/globals.css` — responsive UI
- `db/schema.ts`, `drizzle/` — database schema and migration

## Current access behavior

- Management roles: Branding & Marketing Strategy, Head of Marketing, and Sales Manager.
- The owner account also has management access.
- Managers can configure KPI details and employee records.
- Employees can update only Actual and Notes/evidence for the player record linked to their login email.
- The server revalidates employee writes; this is not only a UI lock.
- Live Site viewers/editors are managed by ChatGPT Sites and are not stored in this source archive.

## Current product features

- Eight equal-level organizational functions with cross-functional collaboration
- THB 1,000,000 monthly company target and carry-forward shortfall
- 100-point KPI scorecard and role templates
- Five gamification levels and personal-best growth tracking
- Team revenue levels
- Revenue missions, customer names, in-charge, and team members
- Branding Consultant prospect funnel
- Existing-customer follow-up tracking
- Real-time shared state through D1

## Deployment note

This archive does not contain live database contents, credentials, or a reusable deployment token. Claude can edit the code and return a patch or updated archive. The Site owner must publish the approved changes back to the existing ChatGPT Site.


## Update 2026-10-02 — Mobile app (PWA)

The app was made installable on phones as a PWA. Details in `outputs/ZRKK_MOBILE_APP_PWA.md`.

- Added: `public/manifest.webmanifest`, `public/sw.js`, `public/offline.html`, app icons in `public/`, `app/pwa-register.tsx`
- Edited: `app/layout.tsx` (manifest/appleWebApp/icons metadata + `viewport` export), `app/globals.css` (safe-area for standalone mode)
- **Not yet built or tested** — the previous machine had no Node.js. Next step: run the validation commands above, fix any build errors (e.g. if vinext does not support the `viewport` export, move those values into `<meta>` tags), then test install on iPhone Safari and Android Chrome.
- Optional future step: wrap in Capacitor for App Store / Play Store (needs full Xcode / Android Studio).

## Update 2026-10-02 — PWA built and tested (Claude Code)

- Source now lives in `zrkk-webapp/` in this repo (extracted from `ZRKK_1M_GAME_Claude_Source.zip`).
- `pnpm exec tsc --noEmit`, `node scripts/check-game.cjs`, and `pnpm build` all pass. vinext supports the `viewport` export (`viewport-fit=cover` and `theme-color` render correctly).
- Fixed `public/sw.js`: build assets are served from `/_next/static/` (not `/assets/`), and the offline page is cached as `/offline`, because Cloudflare static assets redirect `/offline.html` → `/offline` and a redirected response can't answer a navigation.
- `pnpm-workspace.yaml`: filled in the `allowBuilds` placeholders (esbuild/workerd true, sharp false) so `pnpm install` runs the required postinstall steps.
- Tested in headless Chromium with Pixel 7 / iPhone 13 emulation: no horizontal scroll, service worker registers and takes control, offline fallback page shows when the network is down.

## Update 2026-10-02 — Published as a Claude artifact

- Live: https://claude.ai/artifact/KduzDGAuZfWBdBHYQvn5MG (private until shared from its Share menu).
- Build: `pnpm build:artifact` → `dist-artifact/zrkk-1m-game.html`, a single inlined page. Republish that file to the same URL.
- `artifact/backend.ts` answers the dashboard's `/api/state` and `/api/me` calls from the artifact's shared `db` document `app/zrkk`, so `app/dashboard-app.tsx` is unchanged. Defaults moved to `app/state-defaults.ts` (used by both backends).
- Access in the artifact: the owner and anyone shared as **Editor** are managers. Anyone shared as **Contributor** picks their own player once (`artifact/link-player.tsx`; the link is stored privately at `data/users/<id>/profile`) and can then save only Actual and Notes on that player.
- Limitation: the artifact merge is client-side; the db cannot enforce per-field limits like the Cloudflare route does, so a Contributor with technical skill could write the whole state document. Share as Viewer for read-only people.
- The claude.ai `email` scope is not available on this account, so email-based matching from `access.ts` is not used in the artifact.
