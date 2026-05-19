// ─────────────────────────────────────────────────────────────────────────────
// Activity registry - post-event slim version.
//
// The event is over. The only remaining activity surface is the Photo Booth,
// which we keep around so its data (the room gallery) can be showcased during
// the Prize Distribution Ceremony.
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityId = 'booth';

import type { PhaseId } from './schedule';

/** Which phases each activity is unlocked in. Booth is always available. */
export const ACTIVITY_PHASES: Record<ActivityId, PhaseId[]> = {
  booth: ['phase1', 'phase2', 'lunch', 'phase3', 'wrap'],
};

/** Routes that still exist post-event. Others were removed in the ceremony cleanup. */
export const ACTIVITY_ROUTES: Partial<Record<ActivityId, string>> = {
  booth: '/activities/booth',
};

// ─── Networking Bingo missions (kept because BoothPage canvas templates
// historically read from this constant for sample decoration). Safe to
// keep as a static array even though the bingo route is gone.
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

/** All 10 winning lines on a 4x4 grid - kept for reference, may be removed. */
export const BINGO_LINES: number[][] = [
  [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
  [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],
  [0, 5, 10, 15], [3, 6, 9, 12],
];

// ─── Judging criteria - kept since they were referenced; harmless. ──────────
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

// ─── Auth PINs - server-only now, no longer in this file ───────────────────
// PINs live in COORD_PIN / JUDGE_PIN env vars and are verified by the API
// routes. See lib/jwt.ts and the /api/auth/* routes.
