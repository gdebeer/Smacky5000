@AGENTS.md

# Smacky 5000 — Project Memory

## What it is
A multiplayer chess clock web app. Players join from their own phones, no laptop required. One player hosts, others join via a 3-character game code. All real-time sync happens via Pusher Channels.

## Live deployment
- GitHub: https://github.com/gdebeer/Smacky5000
- Deployed on Vercel (auto-deploys on push to main)
- Upstash Redis for game state persistence across serverless instances

## Tech stack
- Next.js 15 App Router + TypeScript
- Tailwind CSS
- Pusher Channels (WebSocket real-time sync)
- Upstash Redis (game state — falls back to in-memory Map for local dev)
- Space Grotesk + JetBrains Mono fonts (Google Fonts)

## Design system
Ported from the "Game Show" project (`/Users/greg_debeer/Documents/Claude Code Projects/Game Show`).
- Warm cream paper background (`#ece5d0`)
- Dark ink text/borders (`#15161a`)
- Hard 4px offset box shadows (no blur) — `show-shadow`
- Zero border radius — hard square edges everywhere
- Orange accent (`#ff9f1c`) for primary actions
- CSS design tokens live in `app/show.css`, imported by `app/globals.css`
- Key classes: `show-btn`, `show-btn-primary`, `show-btn-ink`, `show-card`, `show-bord`, `show-shadow`, `show-caps`, `show-tag`, `show-sticker`, `show-input`, `show-action-btn`

## Key files
- `lib/types.ts` — GameState, PlayerState types
- `lib/store.ts` — Redis + in-memory game state storage
- `lib/pusher-server.ts` — server-side Pusher broadcast (includes `_serverTime` for clock sync)
- `lib/pusher-client.ts` — client-side Pusher singleton
- `app/api/game/route.ts` — POST: create game (3-char code)
- `app/api/game/[gameId]/` — join, settings, start, turn, timeout, start-next, pause, cancel
- `app/[gameId]/page.tsx` — main game room orchestrator (handles session, Pusher subscription, view routing)
- `components/JoinView.tsx` — name entry form
- `components/SettingsView.tsx` — game setup (host-only controls)
- `components/GameView.tsx` — active game (timer, END TURN button, pause overlay, finished screen)

## Game flow
1. Host creates game on `/` → gets 3-char code (e.g. `A3F`)
2. Others visit `/{code}` → enter name → join
3. Settings page: host sets per-player times, buffer, countdown, timeout behavior
4. Host starts → optional countdown → game plays
5. Active player sees their timer counting down + big END TURN button
6. Non-active players see their static remaining time + "Waiting for..." button
7. Between turns: buffer countdown (configurable seconds)
8. Time expires: red background + buzzer sound → skip or pause (per settings)
9. Pause button (any player) → pause overlay on all screens → resume or cancel to settings

## Clock sync
Each Pusher broadcast includes `_serverTime: Date.now()`. Clients compute `clockOffset = serverTime - Date.now()` and apply it to all timer calculations, preventing skew between phones with slightly different clocks.

## Game state key fields
- `status`: `settings | countdown | playing | buffer | paused | finished`
- `turnStartedAt`: epoch ms when current player's timer started
- `phaseStartedAt` + `phaseDurationMs`: for countdown and buffer phases
- `pausedTimeRemainingMs`: saved remaining time when paused
- `players[].allocatedTimeMs`: configured time for player (reset on cancel)
- `players[].timeRemainingMs`: actual remaining (decremented during game)

## Local dev
Requires `.env.local` with Pusher keys. Upstash Redis optional (uses in-memory Map without it, which is fine for single-instance dev).
```
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=us2
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=us2
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```
