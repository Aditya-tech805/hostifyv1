# Hostify

[![CI](https://github.com/Aditya-tech805/hostifyv1/actions/workflows/ci.yml/badge.svg)](https://github.com/Aditya-tech805/hostifyv1/actions/workflows/ci.yml)

**A real-time platform for running live events from one link.** Participants join on their phones, organisers run the room from a console, judges score on their own devices, and a projector view mirrors everything live. Registration, activities, judging and the awards reveal all run through one app.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Realtime + Storage)**. Frontend and backend live in this one repository and deploy as one app.

---

## What it does

| Stage of the event | What Hostify provides |
|---|---|
| **Before** | Event landing page with a live countdown, schedule timeline, speaker notes and judges panel. Team registration with server-side validation. Printable QR poster for the entrance. |
| **Live** | Phase-aware schedule (activities unlock and lock automatically), team dashboard, networking bingo, photo booth with branded frames and a shared gallery, team wall, connect list, live word-cloud polls, timed idea sprints, mentor pings, spotlight wheel, pause-the-room. |
| **Judging** | Presenter queue, per-judge scoring on configurable criteria, rate-limited audience voting with dedup, presentation timer, team slide uploads. |
| **Awards** | Staged podium reveal (3rd → 2nd → 1st → full leaderboard) driven from the console. The projector and every phone update together, and hidden results are never sent to clients before their reveal. |

### Roles and routes

| Route | Who | Purpose |
|---|---|---|
| `/` | Participants | Landing + registration, then the team dashboard and awards results |
| `/activities/*` | Participants | `bingo`, `booth`, `team-wall`, `connect`, `vote` |
| `/console` | Organiser (PIN) | Run the event: phase override, spotlight, queue, polls, sprints, timer, awards, reset |
| `/judges` | Judges (PIN) | Score each team across the judging criteria |
| `/mentor` | Mentors (judge PIN) | Send pings to teams |
| `/screen` | Projector | Full-screen live display (press **F** for fullscreen, ← → to step slides) |
| `/qr` | Entrance desk | Printable QR code pointing at the event URL |

---

## Architecture

```
┌──────────────────────────── one repository, one deploy ────────────────────────────┐
│                                                                                     │
│  FRONTEND  (app/, components/)            BACKEND  (app/api/, lib/jwt.ts,           │
│  React client pages per role                        supabase/migrations/)           │
│   participant · console · judges ·         Next.js route handlers (Node runtime)    │
│   mentor · projector                        POST /api/auth/coordinator              │
│        │                                    POST /api/auth/judge (+ /check-pin)      │
│        │ reads + realtime subscribe         POST /api/team/register                 │
│        │ (anon key, RLS-checked)            POST /api/team/update                   │
│        ▼                                    POST /api/vote                          │
│  lib/sync.ts  ◄──── Supabase Realtime ────►     │  validates input, verifies PINs,  │
│        │                                        │  signs role-scoped JWTs           │
│        │ writes with role JWT                   ▼                                   │
│        └──────────────────────────────►  Supabase Postgres                          │
│                                            kv table + Row-Level Security            │
│                                            vote_log (append-only, dedup)            │
│                                            Storage: gallery · avatars · slides      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Frontend.** Each role is a client page under `app/`. Shared UI is in `components/`, including `components/awards/` for the ceremony module. State is read through typed hooks in `lib/data.ts` (`useAllTeams()`, `usePoll()`, `usePublicReveal()` and so on), which sit on a small sync layer.

**Sync layer (`lib/sync.ts`).** A path-keyed store (`teams/<id>`, `poll`, `publicReveal`, …) backed by one Postgres `kv` table and pushed to every device over Supabase Realtime. With no Supabase keys configured it falls back to `localStorage` with cross-tab `storage` events, so the whole app runs on a single machine with zero setup.

**Backend.**
- `app/api/*` route handlers are the only place secrets are used. They check organiser and judge PINs with constant-time comparison, validate and sanitise team input (`lib/team-validate.ts`), and issue **HS256 JWTs** (12-hour TTL) signed with the Supabase JWT secret (`lib/jwt.ts`). The tokens carry an `app_role` claim (`coordinator`, `judge` or `team`) plus `team_id` or `judge_name`.
- `supabase/migrations/` holds the schema and security rules. The Postgres function `app_can_write_kv(path)` authorises every write by role: organisers can write anything, judges only their own scores and pings, teams only their own records. Audience votes go through `/api/vote`, which deduplicates on an HttpOnly-cookie fingerprint with a unique index on `vote_log`. The master awards results are hidden from non-organisers by RLS; clients only ever read the stage-filtered `publicReveal` copy.

### Project structure

```
app/                      Pages (frontend) and API routes (backend)
  api/                    auth · team register/update · vote
  activities/             bingo · booth · connect · team-wall · vote
  console/ judges/ mentor/ screen/ qr/
components/               Shared UI; components/awards/ = ceremony module
config/event.ts           ← the one file an organiser edits to host their event
lib/                      sync layer, data hooks, schedule, JWT, validation
supabase/migrations/      SQL schema + RLS, run in numeric order
tests/                    Vitest unit tests for the server and domain logic
```

---

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in values, see below
npm run dev                  # http://localhost:3000
```

With the Supabase variables left empty, the app runs in single-device mode (`localStorage`), which is enough to click through every screen. For the PIN-protected pages, set `COORD_PIN`, `JUDGE_PIN` and any long random `SUPABASE_JWT_SECRET`.

### Supabase setup (multi-device realtime)

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run each file in [`supabase/migrations/`](./supabase/migrations) **in numeric order** (`001` → `008`).
3. From **Settings → API**, copy the project URL, the `anon` key and the JWT secret into `.env.local`.
4. Restart `npm run dev`. Open two browsers, register a team in one and watch it appear in the other.

### Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Anon key. Every write is still authorised by RLS |
| `SUPABASE_JWT_SECRET` | **server only** | Signs role JWTs that RLS trusts |
| `COORD_PIN` / `JUDGE_PIN` | **server only** | 4–8 digit PINs for the organiser and judges |
| `NEXT_PUBLIC_EVENT_DATE` | optional | Override the event date, or `today` for an always-live demo |
| `NEXT_PUBLIC_SITE_URL` | optional | Canonical URL for Open Graph metadata |

Never prefix the server-only variables with `NEXT_PUBLIC_`, and never commit `.env.local`.

---

## Hosting your own event

Everything event-specific lives in [`config/event.ts`](./config/event.ts):

- **Identity:** wordmark, edition, full name, tagline, organiser
- **When:** date, timezone, expected team count
- **Schedule:** five phases with times, labels, descriptions and colours. Activities unlock according to the phase.
- **Content:** landing-page welcome notes and the labels for the projector's message slots
- **Namespacing:** `storagePrefix` keeps two events on one domain from sharing browser state

Judging criteria and bingo missions are in [`lib/activities.ts`](./lib/activities.ts). The colour palette is in [`tailwind.config.ts`](./tailwind.config.ts).

The judges panel, connect list, projector messages and awards rankings are managed live from `/console` and need no code changes.

### Running the day

1. **Before doors open:** `/console` → *Reset event data* for a clean start. Put `/screen` on the projector and `/qr` at the entrance.
2. **Rehearsal:** turn on *Preview mode* to unlock every activity, or use *Phase override* to jump to any phase. Turn both off afterwards.
3. **Judging:** tap a team in *Up Next* to put them on the projector, open audience voting and focus the judges.
4. **Awards:** paste final rankings into *Awards* (CSV or TSV), then step through *Reveal 3rd → 2nd → 1st → Leaderboard*. *Hide everything* clears every screen instantly.

---

## Tests

```bash
npm test            # Vitest, runs in ~1s
npm run typecheck
```

The suite covers the logic where a bug would do the most damage: the awards reveal filter (nothing leaks before its stage), JWT signing and tamper/expiry rejection, team input sanitisation (invisible and bidi characters, length caps, colour allowlist), and the phase clock. GitHub Actions runs the type check, tests and a production build on every push and pull request.

## Deploy

Import the repo into [Vercel](https://vercel.com), add the environment variables (mark the server-only ones as *Sensitive*) and deploy. Environment variable changes need a redeploy to take effect.

```bash
npm run build && npm start   # production build locally
```

## Security notes

- PINs and the JWT secret never reach the browser bundle. They are only read inside `app/api/*`.
- All writes are authorised in Postgres by RLS, not just in the UI.
- Awards results are protected at the database level: the master copy isn't readable without an organiser token.
- Known trade-offs, accepted for a one-day event: no per-row rate limit on the `kv` table, and vote dedup is per-cookie, so a determined user who clears cookies can vote again. Both are traceable and slow to exploit.
