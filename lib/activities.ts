// ─────────────────────────────────────────────────────────────────────────────
// Activity data — prompts, missions, criteria. Pulled out of components so we
// can swap or extend them without touching the UI.
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityId =
  | 'bingo'
  | 'team-wall'
  | 'connect'
  | 'spotlight'
  | 'vote'
  | 'booth';

import type { PhaseId } from './schedule';

/** Which phases each activity is unlocked in. */
export const ACTIVITY_PHASES: Record<ActivityId, PhaseId[]> = {
  bingo:       ['phase2'],
  'team-wall': ['phase2', 'phase3'],
  // LinkedIn senior connections - useful whenever the room is socialising.
  // Open from the moment doors open through the awards ceremony.
  connect:     ['phase1', 'phase2', 'lunch', 'phase3', 'wrap'],
  spotlight:   ['phase2'],
  vote:        ['phase3'],
  // Booth is available all event long - selfies are nice in any phase.
  booth:       ['phase1', 'phase2', 'lunch', 'phase3', 'wrap'],
};

/** Activities that currently have a built view. Others render as "Coming soon". */
export const ACTIVITY_ROUTES: Partial<Record<ActivityId, string>> = {
  bingo:       '/activities/bingo',
  'team-wall': '/activities/team-wall',
  connect:     '/activities/connect',
  vote:        '/activities/vote',
  booth:       '/activities/booth',
};

// ─── Networking Bingo ────────────────────────────────────────────────────────
export const BINGO_MISSIONS = [
  'Find a team using AI in their project',
  'High-five a 3rd-year+ senior',
  "Find an idea you'd actually invest in",
  'Find a team led by a first-year',
  'Discover a team with all-women members',
  'Find a team building hardware',
  'Find a team building a mobile app',
  'Find an idea solving an Indian-specific problem',
  'Pitch your idea to a team from a different department',
  'Get an honest critique from another team',
  "Find a team using a stack you've never heard of",
  'Find an idea that genuinely surprised you',
  "Find a team you'd consider co-founding with",
  'Ask a mentor / judge one tactical question',
  'Find a team with the most chaotic prototype',
  'Find an idea your grandparents would understand',
];

/** All 10 winning lines on a 4x4 grid (4 rows + 4 cols + 2 diagonals). */
export const BINGO_LINES: number[][] = [
  [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
  [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],
  [0, 5, 10, 15], [3, 6, 9, 12],
];

// ─── Judging criteria ────────────────────────────────────────────────────────
export interface Criterion {
  id: string;
  name: string;
  hint: string;
}

export const JUDGING_CRITERIA: Criterion[] = [
  { id: 'innovation',   name: 'Innovation',       hint: 'How original is the idea?' },
  { id: 'feasibility',  name: 'Feasibility',      hint: 'Can this actually be built and used?' },
  { id: 'presentation', name: 'Presentation',     hint: 'Clarity, confidence, storytelling.' },
  { id: 'impact',       name: 'Impact',           hint: 'Does it solve a real problem at scale?' },
  { id: 'future',       name: 'Future Potential', hint: 'Could this be a startup? A product? A movement?' },
];

// ─── Auth PINs (server-only) ─────────────────────────────────────────────────
// PINs are NO LONGER stored in this bundle. Anything in this file ships to
// the browser, and the old constants here were trivially extractable via
// view-source / DevTools. The real PINs now live in COORD_PIN / JUDGE_PIN
// server env vars and are verified by /api/auth/coordinator + /api/auth/judge.
// See `lib/jwt.ts`, `lib/auth-client.ts`, and the API routes for the flow.
