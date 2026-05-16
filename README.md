# INNOVATRIX '26

A live innovation experience for sixteen teams · **18 May 2026 · 10 AM – 4 PM IST** · one URL on every phone.

Built with **Next.js 14 · TypeScript · Tailwind CSS**. Deploys static to Vercel.

## Routes

| Route | Audience | Purpose |
|---|---|---|
| `/` | Participants | Register team, dashboard, activity hub |
| `/activities/idea-cards` | Participants (Phase 2) | Random pitch-sharpening prompts |
| `/activities/bingo` | Participants (Phase 2) | 4x4 networking missions |
| `/activities/pitch-lab` | Participants (Phase 2) | 5-step pitch coaching |
| `/console` | Coordinator (PIN `260518`) | Phase override, spotlight, team list |
| `/judges` | Judges (PIN `180526`) | Score 16 teams on 5 criteria |
| `/screen` | Projector | Full-viewport phase-aware display (press F for fullscreen) |

## Stack

- Next.js 14 (App Router) · TypeScript · Tailwind CSS 3.4
- Google Fonts via `next/font`: Space Grotesk · Inter · JetBrains Mono
- **Supabase Realtime** for cross-device state sync (free tier: 500 concurrent connections)
- LocalStorage fallback when Supabase env vars are missing — the app stays usable in single-device mode
- Deploys to Vercel as static files; the only "backend" is Supabase BaaS (no server you maintain)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build & deploy

```bash
npm run build      # produces .next/
npm start          # serves the prod build locally
```

Vercel: import the repo, hit deploy. Zero config needed.

## Dev: seed mock teams

To populate the team list (for testing console and judges before real registrations):

```js
localStorage.setItem('innovatrix26.mock-teams', JSON.stringify([
  { id: 'mock-1', name: 'Apex',    color: '#7c3aed', members: ['Riya','Aman'],         idea: 'Real-time sign-language to text via webcam', registeredAt: Date.now() },
  { id: 'mock-2', name: 'Aether',  color: '#84cc16', members: ['Pri','Vik','Sneha'],   idea: 'Hyperlocal weather alerts for farmers via SMS', registeredAt: Date.now() },
  { id: 'mock-3', name: 'Nimbus',  color: '#f97316', members: ['Diya'],                idea: 'Mood-aware playlists from your sleep data', registeredAt: Date.now() },
  { id: 'mock-4', name: 'Ravine',  color: '#0ea5e9', members: ['Rohan','Tanvi'],       idea: 'Anonymous community reporting for road hazards', registeredAt: Date.now() },
  { id: 'mock-5', name: 'Polaris', color: '#f43f5e', members: ['Karan','Maya'],        idea: 'AI tutor that adapts to your subject anxiety', registeredAt: Date.now() },
])); location.reload();
```

## Supabase setup (10 minutes, for cross-device sync)

The app works without Supabase — it falls back to localStorage and runs single-device. Once you do this setup, every phone + projector syncs in real time.

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign up (free, no card)
2. Create a project named `innovatrix-26` → pick a region close to you (Mumbai if you're in India) → set a database password (you won't need it after setup)
3. Wait ~1 minute for the project to provision
4. In the left sidebar: **SQL Editor** → **New query** → paste the contents of [`supabase-setup.sql`](./supabase-setup.sql) → **Run**. Should see "Success. No rows returned."
5. **Settings → API** → copy `Project URL` and `anon public` key
6. In your repo, copy `.env.example` → `.env.local` and paste:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<long-anon-key>
   ```
7. Restart `npm run dev`. Open two browser windows — register a team in one, see it appear instantly in the other. Done.

After the event, tighten the RLS policies in `supabase-setup.sql` (replace `using (true)` with `auth.uid() = ...` checks) if you keep the project around.

## Test the activities right now

The phase-aware unlocks gate everything until 10:45 AM on May 18. To preview activities before then:

1. Open [/console](http://localhost:3000/console), enter PIN `260518`
2. Tap **Phase 2** under "Phase override" (confirm dialog)
3. Open [/](http://localhost:3000/) in another tab — activity cards now show `LIVE`
4. When done, return to console → "Clear override" to resume auto-clock

## Brand

| Role | Colour |
|---|---|
| Background | `#0a0a0f` near-black |
| Surface | `#16161e` |
| Primary | `#7c3aed` electric violet |
| Accent | `#84cc16` lime |
| Spark | `#f97316` coral |
| Ink | `#f5f3ee` warm cream |

## Status

- [x] Next.js + TypeScript + Tailwind scaffold
- [x] Brand foundation (fonts, palette, asterisk-burst mark)
- [x] Phase 1 registration · team dashboard · live clock
- [x] Coordinator console + PIN auth + phase override + spotlight picker
- [x] Judges console + PIN + per-judge scores (auto-save sliders + notes)
- [x] Big screen (projector)
- [x] Phase 2 activities: Idea Card Roulette · Pitch Lab · Networking Bingo
- [ ] Firebase wiring (cross-device sync)
- [ ] Phase 2 remaining: Spotlight Wheel synced animation, Team Wall, Mentor Pings
- [ ] Phase 3 audience vote / final reveal

`legacy/` contains the prior single-file HTML prototype.
