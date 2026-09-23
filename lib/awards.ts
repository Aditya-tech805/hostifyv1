// ─────────────────────────────────────────────────────────────────────────────
// Awards ceremony — pure data model + reveal logic.
//
// No React, no sync layer: this module is shared by the client hooks in
// lib/data.ts and the unit tests. The key invariant lives here: the audience
// copy (publicReveal) never contains a ranking before its stage is reached.
// ─────────────────────────────────────────────────────────────────────────────

export type CeremonyStage = 'idle' | 'third' | 'second' | 'first' | 'leaderboard';

export interface FinalRanking {
  /** Numeric rank (1, 2, 3, ...). A 3-way tie can have three entries at
   *  rank 19 with the next entry at 22, etc. Disqualified teams use rank
   *  -1 and have disqualified=true so the ceremony renders them grayed
   *  out at the bottom of the leaderboard. */
  rank: number;
  /** Team number on the printed roster. Optional - mostly cosmetic. */
  teamNumber?: number;
  /** Team display name shown on the projector. */
  teamName: string;
  /** Total marks awarded by the panel. */
  marks: number;
  /** Optional team_id if we matched this entry to a record in the teams kv. */
  teamId?: string;
  /** Optional brand colour for the team stripe. Falls back to a palette. */
  color?: string;
  disqualified?: boolean;
}

export interface FinalResults {
  rankings: FinalRanking[];
  stage: CeremonyStage;
  /** When each reveal was triggered. Lets us drive entrance animations
   *  off a fresh timestamp instead of guessing on first render. */
  revealedAt?: Partial<Record<CeremonyStage, number>>;
}

/**
 * Given the master results, compute the slice that the audience is
 * allowed to see. Empty rankings for the idle stage; only the top-N
 * non-DQ rows for the reveal stages; full list for the leaderboard.
 */
export function computePublicReveal(master: FinalResults): FinalResults {
  const { stage, rankings, revealedAt } = master;
  let visible: FinalRanking[];
  if (stage === 'idle') {
    visible = [];
  } else if (stage === 'third') {
    visible = rankings.filter((r) => r.rank === 3 && !r.disqualified);
  } else if (stage === 'second') {
    visible = rankings.filter((r) => (r.rank === 2 || r.rank === 3) && !r.disqualified);
  } else if (stage === 'first') {
    visible = rankings.filter((r) => r.rank >= 1 && r.rank <= 3 && !r.disqualified);
  } else {
    // leaderboard
    visible = rankings;
  }
  return { stage, rankings: visible, revealedAt };
}

/** Move the ceremony to `stage`, stamping when it happened. Rankings are untouched. */
export function withStage(current: FinalResults | null, stage: CeremonyStage, now = Date.now()): FinalResults {
  return current
    ? { ...current, stage, revealedAt: { ...(current.revealedAt ?? {}), [stage]: now } }
    : { rankings: [], stage, revealedAt: { [stage]: now } };
}

/** Pull the top-3 entries in display order ([third, second, first]). */
export function topThree(results: FinalResults | null): { first?: FinalRanking; second?: FinalRanking; third?: FinalRanking } {
  if (!results) return {};
  const byRank = (r: number) => results.rankings.find((x) => x.rank === r && !x.disqualified);
  return { first: byRank(1), second: byRank(2), third: byRank(3) };
}

