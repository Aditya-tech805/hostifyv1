// ─────────────────────────────────────────────────────────────────────────────
// Event schedule — anchored to May 18, 2026 IST. Single source of truth for
// every page that needs phase / countdown awareness.
// ─────────────────────────────────────────────────────────────────────────────

export const EVENT_DATE = '2026-05-18';
export const EVENT_TZ = '+05:30';

export type PhaseId = 'phase1' | 'phase2' | 'lunch' | 'phase3' | 'wrap';

export interface Phase {
  id: PhaseId;
  label: string;     // full label, e.g. "Phase 2 · Build & Interact"
  short: string;     // e.g. "BUILD"
  start: number;     // epoch ms
  end: number;       // epoch ms
}

const at = (hhmm: string) => new Date(`${EVENT_DATE}T${hhmm}:00${EVENT_TZ}`).getTime();

// Aligned to the official INNOVATRIX 2026 event itinerary (PDF):
//   09:30 - 10:00  Registration & Check-in        \
//   10:00 - 10:30  Opening Ceremony                ) Phase 1 - Welcome
//   10:30 - 10:45  Seat Allotments                /
//   10:45 - 12:00  Idea Development Session       \
//   12:00 - 12:15  Refreshments                    ) Phase 2 - Ideate
//   12:15 - 13:00  Continue Idea Development      /
//   13:00 - 14:00  Lunch Break                    -> Lunch
//   14:00 - 15:45  Judging & Evaluation           -> Phase 3 - Judging
//   15:45 - 16:00  Vote of Thanks                 \
//   16:00 - 16:15  Award Ceremony                  ) Wrap - Thanks & Awards
export const SCHEDULE: Phase[] = [
  { id: 'phase1', label: 'Phase 1 · Welcome',              short: 'WELCOME', start: at('09:30'), end: at('10:45') },
  { id: 'phase2', label: 'Phase 2 · Idea Development',     short: 'IDEATE',  start: at('10:45'), end: at('13:00') },
  { id: 'lunch',  label: 'Lunch · Reset & Recharge',       short: 'LUNCH',   start: at('13:00'), end: at('14:00') },
  { id: 'phase3', label: 'Phase 3 · Judging & Evaluation', short: 'JUDGE',   start: at('14:00'), end: at('15:45') },
  { id: 'wrap',   label: 'Wrap · Thanks & Awards',         short: 'AWARDS',  start: at('15:45'), end: at('16:15') },
];

export const PHASE_MAP: Record<PhaseId, Phase> = Object.fromEntries(
  SCHEDULE.map((p) => [p.id, p]),
) as Record<PhaseId, Phase>;

export type PhaseStatus = 'pre' | 'live' | 'post' | 'override';

export interface PhaseState {
  status: PhaseStatus;
  phase?: Phase;
  next?: Phase;
}

export function getPhaseState(now: Date, override?: PhaseId | null): PhaseState {
  if (override && PHASE_MAP[override]) {
    const phase = PHASE_MAP[override];
    const idx = SCHEDULE.indexOf(phase);
    return { status: 'override', phase, next: SCHEDULE[idx + 1] };
  }
  const t = now.getTime();
  if (t < SCHEDULE[0].start) return { status: 'pre', next: SCHEDULE[0] };
  for (let i = 0; i < SCHEDULE.length; i++) {
    const p = SCHEDULE[i];
    if (t >= p.start && t < p.end) return { status: 'live', phase: p, next: SCHEDULE[i + 1] };
  }
  return { status: 'post' };
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatCountdown(ms: number): string {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
}

export function formatHHMMSS(ms: number): string {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
