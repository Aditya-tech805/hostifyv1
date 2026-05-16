// ─────────────────────────────────────────────────────────────────────────────
// Activity data — prompts, missions, criteria. Pulled out of components so we
// can swap or extend them without touching the UI.
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityId =
  | 'idea-cards'
  | 'bingo'
  | 'team-wall'
  | 'pitch-lab'
  | 'spotlight'
  | 'vote'
  | 'booth';

import type { PhaseId } from './schedule';

/** Which phases each activity is unlocked in. */
export const ACTIVITY_PHASES: Record<ActivityId, PhaseId[]> = {
  'idea-cards': ['phase2'],
  bingo:        ['phase2'],
  'team-wall':  ['phase2', 'phase3'],
  'pitch-lab':  ['phase2'],
  spotlight:    ['phase2'],
  vote:         ['phase3'],
  // Booth is available all event long — selfies are nice in any phase.
  booth:        ['phase1', 'phase2', 'lunch', 'phase3', 'wrap'],
};

/** Activities that currently have a built view. Others render as "Coming soon". */
export const ACTIVITY_ROUTES: Partial<Record<ActivityId, string>> = {
  'idea-cards': '/activities/idea-cards',
  'pitch-lab':  '/activities/pitch-lab',
  bingo:        '/activities/bingo',
  'team-wall':  '/activities/team-wall',
  vote:         '/activities/vote',
  booth:        '/activities/booth',
};

// ─── Idea Card Roulette ────────────────────────────────────────────────────────
export const IDEA_PROMPTS = [
  'What real-life problem are you solving?',
  'Who exactly is this for? Picture one person.',
  "What do users do today instead — and why does it suck?",
  "What's the one thing that, if you got it wrong, would kill the idea?",
  "How does your idea make someone's day measurably better?",
  'If you had ten times the budget, what would you build first?',
  "What's the smallest version of this you could ship in a week?",
  "Why now? What's changed that makes this finally possible?",
  'Who could copy you tomorrow — and what would still make you different?',
  'What part of this idea would your harshest critic attack first?',
  'What would your grandparents say if you explained this to them?',
  'What does success look like a year from now? Be specific.',
  'Who is going to pay for this — and how much?',
  "What's the boring, unglamorous part of building this?",
  'If you removed the AI from your idea, would it still matter?',
  "What's the very first feature a user would actually use?",
  "What assumption are you making that could turn out to be wrong?",
  "What's one thing you've learned by talking to potential users?",
  'How is this idea different from what already exists?',
  'If this becomes huge, what does the world look like differently?',
  "What's the most surprising thing about your idea?",
  "What's the one metric that proves it's working?",
  'Who is your unfair advantage as a team to build this?',
  'What happens if a big company builds this next month?',
  "What's the one demo you'd show to make someone say \"wow\"?",
  "What part of your pitch are you most nervous about?",
  'If you had to explain this in a tweet, what would it say?',
  'What does your idea look like in three years?',
  "What's the simplest objection a user might raise — and what's your answer?",
  'What gets you out of bed wanting to build this?',
];

// ─── Pitch Lab ────────────────────────────────────────────────────────────────
export interface PitchStep {
  id: string;
  question: string;
  hint: string;
  target: string;
}

export const PITCH_STEPS: PitchStep[] = [
  {
    id: 'problem',
    question: 'What real-life problem are you solving?',
    hint:
      'One sentence. Concrete. Imagine the person who has this problem — describe their day.',
    target: 'Aim for 1–2 sentences.',
  },
  {
    id: 'solution',
    question: 'Your one-sentence solution.',
    hint:
      "Be punchy. Avoid 'leveraging' / 'synergy' / 'platform'. What does it do, plainly?",
    target: 'One sentence is enough.',
  },
  {
    id: 'who',
    question: 'Who exactly will use this?',
    hint: 'Imagine one specific person. Their age, role, what they do today.',
    target: '2–3 sentences.',
  },
  {
    id: 'why-now',
    question: 'Why is this the right time for this idea?',
    hint: "What's changed in the world that makes it finally possible (or finally necessary)?",
    target: '1–2 sentences.',
  },
  {
    id: 'unique',
    question: "What's different about your version of this?",
    hint:
      "Even if 100 people are working on this, what's yours that no one else has?",
    target: '1–2 sentences.',
  },
];

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

// ─── Auth PINs (placeholders — change before event) ──────────────────────────
export const PINS = {
  coordinator: '260518',
  judge:       '180526',
} as const;
