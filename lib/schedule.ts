// ─────────────────────────────────────────────────────────────────────────────
// Event schedule — derived from config/event.ts. Single source of truth for
// every page that needs phase / countdown awareness.
// ─────────────────────────────────────────────────────────────────────────────

import { EVENT, eventTime, type PhaseId } from '@/config/event';

export type { PhaseId };

export const EVENT_DATE = EVENT.date;
export const EVENT_TZ = EVENT.tz;

export interface Phase {
  id: PhaseId;
  label: string;     // full label, e.g. "Phase 2 · Build"
  short: string;     // e.g. "BUILD"
  start: number;     // epoch ms
  end: number;       // epoch ms
}

export const SCHEDULE: Phase[] = EVENT.schedule.map((p) => ({
  id: p.id,
  label: p.label,
  short: p.short,
  start: eventTime(p.start),
  end: eventTime(p.end),
}));

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
