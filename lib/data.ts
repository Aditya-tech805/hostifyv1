'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Typed wrappers around the sync layer. Each app concept (teams, phase,
// spotlight, scores, results, etc.) gets its own hook so callsites stay clean.
// The sync layer underneath is Supabase realtime (or localStorage fallback).
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useSyncedValue, useSyncedMap, writeSynced, subscribeSynced } from './sync';
import { getSupabase, SUPABASE_ENABLED } from './supabase';
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
  gallery:       'gallery',        // gallery/{photoId} → Photo (metadata)
  previewMode:   'previewMode',    // boolean — when true, all activities unlocked
  pauseMode:     'pauseMode',      // boolean — when true, participant UI is frozen
  timer:         'timer',          // TimerState | null
  poll:          'poll',           // PollState | null
  pollSubmissions: 'pollSubmissions', // pollSubmissions/{deviceId} → string
  sprint:        'sprint',         // SprintState | null
  sprintSubs:    'sprintSubs',     // sprintSubs/{teamId} → SprintSubmission
  panel:         'panel',          // panel/{id} → PanelMember (jury list shown on the landing)
  messages:      'messages',       // messages/{slot} → ScreenMessage (faculty/hod/studentCoord — projector carousel)
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

// ─── Preview mode (testing) ──────────────────────────────────────────────────
/**
 * When true, the participant view unlocks every activity regardless of the
 * current phase or the override. Used by you + co-coordinators to play
 * through everything before event day. Turn OFF an hour before the event.
 */
export function usePreviewMode(): [boolean, (v: boolean) => void] {
  const [value, set] = useSyncedValue<boolean>(PATHS.previewMode, false);
  return [value, set];
}

// ─── Pause mode (sudden-stop on the room) ────────────────────────────────────
/**
 * When `true`, every participant device shows a "Paused" banner that blocks
 * new submissions. State is preserved — just frozen. Coordinator can flip
 * it on/off whenever, e.g. to make an announcement mid-activity.
 */
export function usePauseMode(): [boolean, (v: boolean) => void] {
  const [value, set] = useSyncedValue<boolean>(PATHS.pauseMode, false);
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

export type CastVoteResult =
  | { ok: true; tally: VoteTally }
  | { ok: false; alreadyVoted?: boolean; error: string };

/**
 * Cast a vote via the rate-limited API (Phase 4). The server validates
 * against the active presenter window, deduplicates by an HttpOnly cookie,
 * and writes both the audit log and the aggregate. The client no longer
 * touches audienceVotes/* directly — RLS would reject it anyway.
 *
 * `current` is unused now (kept for call-site compatibility); the API
 * returns the authoritative tally.
 */
export async function castAudienceVote(
  teamId: string,
  choice: AudienceVoteChoice,
  _current: VoteTally,
): Promise<CastVoteResult> {
  try {
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // credentials: 'same-origin' is the default — the device cookie
      // is on the same host so it flows automatically.
      body: JSON.stringify({ teamId, choice }),
    });
    if (res.status === 409) {
      const j = (await res.json().catch(() => ({}))) as { error?: string; alreadyVoted?: boolean };
      return { ok: false, alreadyVoted: !!j.alreadyVoted, error: j.error || 'Already voted.' };
    }
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: j.error || 'Could not record vote.' };
    }
    const data = (await res.json()) as { ok: true; tally: VoteTally };
    return { ok: true, tally: data.tally };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error.' };
  }
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

// ─── Photo gallery ───────────────────────────────────────────────────────────
export interface Photo {
  id: string;
  url: string;          // public URL of the file in Supabase Storage
  teamId: string;
  teamName: string;
  teamColor: string;
  uploadedAt: number;
}

const GALLERY_BUCKET = 'gallery';

export function useGallery(): Photo[] {
  const map = useSyncedMap<Photo>(PATHS.gallery);
  return useMemo(
    () => Object.values(map).sort((a, b) => b.uploadedAt - a.uploadedAt),
    [map],
  );
}

/**
 * Upload a JPEG blob to Supabase Storage and record the metadata in the
 * synced `gallery/{id}` path. Returns the resulting public URL.
 *
 * When Supabase isn't configured, we skip the upload and store a base64
 * data URL inside the metadata so single-device dev still shows the
 * gallery (just bigger memory footprint).
 */
export async function uploadGalleryPhoto(
  blob: Blob,
  team: { id: string; name: string; color: string },
): Promise<Photo> {
  const id = 'photo-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  let url = '';

  if (SUPABASE_ENABLED) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client unavailable.');
    const path = `${id}.jpg`;
    const { error } = await supabase.storage.from(GALLERY_BUCKET).upload(path, blob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
    });
    if (error) throw error;
    const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
    url = data.publicUrl;
  } else {
    // Fallback: turn the blob into a data URL so the gallery still works locally.
    url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  const photo: Photo = {
    id,
    url,
    teamId: team.id,
    teamName: team.name,
    teamColor: team.color,
    uploadedAt: Date.now(),
  };
  void writeSynced(`${PATHS.gallery}/${id}`, photo);
  return photo;
}

/** Delete a photo. Coordinator-only at the UI layer (no auth on Storage yet). */
export async function deleteGalleryPhoto(photo: Photo): Promise<void> {
  if (SUPABASE_ENABLED) {
    const supabase = getSupabase();
    if (supabase) {
      const path = `${photo.id}.jpg`;
      await supabase.storage.from(GALLERY_BUCKET).remove([path]);
    }
  }
  void writeSynced(`${PATHS.gallery}/${photo.id}`, null);
}

// ─── Presentation Timer ──────────────────────────────────────────────────────
export interface TimerState {
  /** When the timer was started (epoch ms). Null when paused. */
  startedAt: number | null;
  /** Total duration in ms. */
  durationMs: number;
  /** Remaining ms at the moment of last pause. Used to resume cleanly. */
  remainingMs: number;
  /** Optional label shown alongside the countdown. */
  label?: string;
}

export function useTimer(): [TimerState | null, (v: TimerState | null) => void] {
  const [value, set] = useSyncedValue<TimerState | null>(PATHS.timer, null);
  return [value, set];
}

export function setTimer(v: TimerState | null): void {
  void writeSynced(PATHS.timer, v);
}

// ─── Live Word Cloud Poll ────────────────────────────────────────────────────
export interface PollState {
  id: string;
  question: string;
  startedAt: number;
}

export function usePoll(): [PollState | null, (v: PollState | null) => void] {
  const [value, set] = useSyncedValue<PollState | null>(PATHS.poll, null);
  return [value, set];
}
export function setPoll(v: PollState | null): void {
  void writeSynced(PATHS.poll, v);
  // Wipe submissions when starting a new poll
  if (v) {
    // can't bulk-clear easily; consumers should namespace per-poll id
  }
}

/**
 * Each device's poll submission. Keyed by a stable per-device ID so a
 * single phone can't spam-flood the cloud.
 */
export function usePollSubmissions(): Record<string, string> {
  return useSyncedMap<string>(PATHS.pollSubmissions);
}

export function submitPollWord(deviceId: string, word: string): void {
  void writeSynced(`${PATHS.pollSubmissions}/${deviceId}`, word);
}

export function clearPollSubmissions(): void {
  // Iterate the map and delete each. Caller has access to the map already
  // so they can pass it in — but for simplicity we let it stay until next
  // poll starts. The screen filters by current poll's startedAt anyway.
}

// ─── Speed Idea Sprint ───────────────────────────────────────────────────────
export interface SprintState {
  id: string;
  prompt: string;
  durationMs: number;
  startedAt: number;
  /** When compose ends. After this, no new submissions accepted. */
  endsAt: number;
  /** Optional final-pick teamIds chosen by coordinator post-sprint. */
  winners?: string[];
}

export interface SprintSubmission {
  teamId: string;
  teamName: string;
  teamColor: string;
  text: string;
  submittedAt: number;
}

export function useSprint(): [SprintState | null, (v: SprintState | null) => void] {
  const [value, set] = useSyncedValue<SprintState | null>(PATHS.sprint, null);
  return [value, set];
}
export function setSprint(v: SprintState | null): void {
  void writeSynced(PATHS.sprint, v);
}

export function useSprintSubmissions(): SprintSubmission[] {
  const map = useSyncedMap<SprintSubmission>(PATHS.sprintSubs);
  return useMemo(
    () => Object.values(map).sort((a, b) => a.submittedAt - b.submittedAt),
    [map],
  );
}

export function submitSprintAnswer(sub: SprintSubmission): void {
  // One submission per team — keyed by teamId so resubmits overwrite.
  void writeSynced(`${PATHS.sprintSubs}/${sub.teamId}`, sub);
}

// ─── Jury panel (curated judge list shown on the landing) ───────────────────
/**
 * NOTE: this is *separate* from the `scores` table. `scores` is keyed by
 * the judge's typed name at sign-in; `panel` is the public-facing roster
 * the coordinator curates from /console for display on the landing page.
 */
export interface PanelMember {
  id: string;
  name: string;
  role: string;
  color: string;
  addedAt: number;
}

export function usePanel(): PanelMember[] {
  const map = useSyncedMap<PanelMember>(PATHS.panel);
  return useMemo(
    () => Object.values(map).sort((a, b) => a.addedAt - b.addedAt),
    [map],
  );
}

export function writePanelMember(member: PanelMember): void {
  void writeSynced(`${PATHS.panel}/${member.id}`, member);
}

export function removePanelMember(memberId: string): void {
  void writeSynced(`${PATHS.panel}/${memberId}`, null);
}

// ─── Screen carousel messages (faculty / HOD / student coordinator) ─────────
/**
 * Messages shown on the projector's idle carousel. Coordinator types them
 * from /console; the screen route reads them via useMessage(slot).
 *
 * `body` is the actual message; empty/whitespace-only bodies cause the slide
 * to be skipped on the projector, so coordinators can stage messages in
 * advance without showing placeholders.
 */
export type MessageSlot = 'faculty' | 'hod' | 'studentCoord';

export interface ScreenMessage {
  from: string;
  role: string;
  body: string;
  updatedAt: number;
}

const EMPTY_MESSAGE: ScreenMessage = { from: '', role: '', body: '', updatedAt: 0 };

export function useMessage(slot: MessageSlot): ScreenMessage {
  const [value] = useSyncedValue<ScreenMessage>(`${PATHS.messages}/${slot}`, EMPTY_MESSAGE);
  return value ?? EMPTY_MESSAGE;
}

export function writeMessage(slot: MessageSlot, msg: ScreenMessage): void {
  void writeSynced(`${PATHS.messages}/${slot}`, msg);
}

// ─── Reset all event data (coordinator-only nuke) ────────────────────────────
/**
 * Wipes every team, score, vote, ping, photo, and event-state value.
 * Used between test runs and on the morning of event day for a clean start.
 *
 * Returns counts so the UI can show what was deleted.
 */
export async function resetAllEventData(): Promise<{ kvRows: number; photos: number }> {
  let kvRows = 0;
  let photos = 0;

  if (SUPABASE_ENABLED) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client unavailable.');

    // Wipe Storage bucket first (photos)
    const { data: files } = await supabase.storage.from(GALLERY_BUCKET).list('', { limit: 1000 });
    if (files && files.length > 0) {
      const names = files.map((f) => f.name);
      await supabase.storage.from(GALLERY_BUCKET).remove(names);
      photos = names.length;
    }

    // Then wipe the kv table — neq filter is required by Supabase delete API
    const { count } = await supabase.from('kv').delete({ count: 'exact' }).neq('path', '__never__');
    kvRows = count ?? 0;
  } else {
    // localStorage fallback — remove every key under innovatrix26.sync.*
    if (typeof window !== 'undefined') {
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k?.startsWith('innovatrix26.sync.')) toRemove.push(k);
      }
      toRemove.forEach((k) => window.localStorage.removeItem(k));
      kvRows = toRemove.length;
    }
  }

  return { kvRows, photos };
}
