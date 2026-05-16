'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Typed wrappers around the sync layer. Each app concept (teams, phase,
// spotlight, scores, results, etc.) gets its own hook so callsites stay clean.
// The sync layer underneath is Supabase realtime (or localStorage fallback).
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useSyncedValue, useSyncedMap, writeSynced, subscribeSynced } from './sync';
import type { Team } from './teams';
import type { PhaseId } from './schedule';

// ─── Paths (single source of truth) ──────────────────────────────────────────
const PATHS = {
  teams:         'teams',          // teams/{teamId} → Team
  phaseOverride: 'phaseOverride',  // PhaseId | null
  spotlight:     'spotlight',      // SpotlightState | null
  scores:        'scores',         // scores/{judgeName}/{teamId} → ScoreEntry
  results:       'results',        // ResultsState | null
  upNext:        'upNext',         // UpNextState | null
  audienceVotes: 'audienceVotes',  // audienceVotes/{teamId} → VoteTally
  mentorPings:   'mentorPings',    // mentorPings/{teamId}/{pingId} → MentorPing
} as const;

// ─── Teams ───────────────────────────────────────────────────────────────────
export function useAllTeams(): Team[] {
  const map = useSyncedMap<Team>(PATHS.teams);
  return useMemo(
    () => Object.values(map).sort((a, b) => a.registeredAt - b.registeredAt),
    [map],
  );
}

export function writeTeam(team: Team): void {
  void writeSynced(`${PATHS.teams}/${team.id}`, team);
}

export function removeTeam(teamId: string): void {
  void writeSynced(`${PATHS.teams}/${teamId}`, null);
}

// ─── Phase override ──────────────────────────────────────────────────────────
export function usePhaseOverride(): [PhaseId | null, (v: PhaseId | null) => void] {
  const [value, set] = useSyncedValue<PhaseId | null>(PATHS.phaseOverride, null);
  return [value, set];
}

// ─── Spotlight ───────────────────────────────────────────────────────────────
export interface SpotlightState {
  spinId: string;
  teamIds: string[];
  at: number;
}

export function useSpotlight(): [SpotlightState | null, (v: SpotlightState | null) => void] {
  const [value, set] = useSyncedValue<SpotlightState | null>(PATHS.spotlight, null);
  return [value, set];
}

export function setSpotlight(state: SpotlightState | null): void {
  void writeSynced(PATHS.spotlight, state);
}

// ─── Judge scores ────────────────────────────────────────────────────────────
export interface ScoreEntry {
  innovation?: number;
  feasibility?: number;
  presentation?: number;
  impact?: number;
  future?: number;
  notes?: string;
  judgedAt?: number;
}
export type AllScores = Record<string, Record<string, ScoreEntry>>;

/**
 * All scores across all judges. The underlying map keys are like
 * "judgeName/teamId" (flat); we transform back to the nested
 * { judgeName: { teamId: entry } } shape consumers expect.
 */
export function useAllScores(): AllScores {
  const flat = useSyncedMap<ScoreEntry>(PATHS.scores);
  return useMemo(() => {
    const nested: AllScores = {};
    for (const [key, entry] of Object.entries(flat)) {
      const slash = key.indexOf('/');
      if (slash < 0) continue;
      const judge = key.slice(0, slash);
      const teamId = key.slice(slash + 1);
      if (!judge || !teamId) continue;
      (nested[judge] ||= {})[teamId] = entry;
    }
    return nested;
  }, [flat]);
}

export function useJudgeScores(judgeName: string): {
  scores: Record<string, ScoreEntry>;
  setScore: (teamId: string, entry: ScoreEntry) => void;
} {
  const all = useAllScores();
  const judgeKey = judgeName || 'anon';
  const scores = all[judgeKey] ?? {};
  const setScore = (teamId: string, entry: ScoreEntry) => {
    void writeSynced(`${PATHS.scores}/${judgeKey}/${teamId}`, entry);
  };
  return { scores, setScore };
}

// ─── Results ─────────────────────────────────────────────────────────────────
export interface ResultsState {
  revealed: boolean;
  at: number;
}

export function useResults(): [ResultsState | null, (v: ResultsState | null) => void] {
  const [value, set] = useSyncedValue<ResultsState | null>(PATHS.results, null);
  return [value, set];
}

export function revealResultsNow(): void {
  void writeSynced(PATHS.results, { revealed: true, at: Date.now() });
}

export function clearResults(): void {
  void writeSynced(PATHS.results, null);
}

// ─── Up Next (Phase 3 currently-presenting team) ─────────────────────────────
export interface UpNextState {
  teamId: string;
  startedAt: number;
}
export function useUpNext(): [UpNextState | null, (v: UpNextState | null) => void] {
  const [value, set] = useSyncedValue<UpNextState | null>(PATHS.upNext, null);
  return [value, set];
}
export function setUpNext(state: UpNextState | null): void {
  void writeSynced(PATHS.upNext, state);
}

// ─── Audience votes ──────────────────────────────────────────────────────────
export type AudienceVoteChoice = 'wow' | 'cool' | 'fine';
export interface VoteTally { wow: number; cool: number; fine: number; }

export function useVoteTally(teamId: string | null): VoteTally {
  const [tally] = useSyncedValue<VoteTally>(
    teamId ? `${PATHS.audienceVotes}/${teamId}` : `${PATHS.audienceVotes}/__none__`,
    { wow: 0, cool: 0, fine: 0 },
  );
  return tally ?? { wow: 0, cool: 0, fine: 0 };
}

/**
 * Increment vote count for a team. Read-modify-write race exists at scale,
 * but for a 100-person event it's acceptable — the absolute count isn't
 * audit-critical.
 */
export function castAudienceVote(teamId: string, choice: AudienceVoteChoice, current: VoteTally): void {
  const next: VoteTally = { ...current, [choice]: (current[choice] ?? 0) + 1 };
  void writeSynced(`${PATHS.audienceVotes}/${teamId}`, next);
}

export function useAllVoteTallies(): Record<string, VoteTally> {
  return useSyncedMap<VoteTally>(PATHS.audienceVotes);
}

// ─── Mentor pings ────────────────────────────────────────────────────────────
export interface MentorPing {
  id: string;
  from: string;
  question: string;
  at: number;
  acknowledged?: boolean;
}

export function useMentorPings(teamId: string | null): MentorPing[] {
  const map = useSyncedMap<MentorPing>(teamId ? `${PATHS.mentorPings}/${teamId}` : `${PATHS.mentorPings}/__none__`);
  return useMemo(() => Object.values(map).sort((a, b) => b.at - a.at), [map]);
}

export function sendMentorPing(teamId: string, from: string, question: string): void {
  const pingId = 'ping-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  const ping: MentorPing = { id: pingId, from, question, at: Date.now() };
  void writeSynced(`${PATHS.mentorPings}/${teamId}/${pingId}`, ping);
}

/**
 * Marks a ping as acknowledged. We pass the FULL ping object so we can
 * write the whole row back patched — under the KV model there is no
 * field-level update, so the caller (which already has the ping in
 * memory from useMentorPings) gives it to us to avoid a round-trip read.
 */
export function acknowledgeMentorPing(teamId: string, ping: MentorPing): void {
  void writeSynced(`${PATHS.mentorPings}/${teamId}/${ping.id}`, { ...ping, acknowledged: true });
}

// ─── Subscribe helpers (for non-React code if needed) ────────────────────────
export function subscribeSpotlight(cb: (v: SpotlightState | null) => void): () => void {
  return subscribeSynced<SpotlightState>(PATHS.spotlight, cb);
}
export function subscribeResults(cb: (v: ResultsState | null) => void): () => void {
  return subscribeSynced<ResultsState>(PATHS.results, cb);
}
