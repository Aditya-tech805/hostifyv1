// ─────────────────────────────────────────────────────────────────────────────
// Hostify event configuration — the ONE file an organiser edits to host their
// own event. Everything event-specific (name, date, schedule, copy, people)
// lives here; every page, the projector, the photo-booth frames and the OG
// image read from it.
//
// The phase IDs are fixed (the app's activity gating is keyed off them) but
// their labels, times and copy are yours:
//
//   phase1 → arrival / check-in      phase3 → presentations + judging
//   phase2 → the main build block    wrap   → thanks + awards ceremony
//   lunch  → a break
//
// A few values can be overridden per deployment without touching code:
//   NEXT_PUBLIC_EVENT_DATE   YYYY-MM-DD, or "today" for an always-live demo
// ─────────────────────────────────────────────────────────────────────────────

export const PLATFORM = {
  name: 'Hostify',
  tagline: 'Run a live event from one link.',
} as const;

export type PhaseId = 'phase1' | 'phase2' | 'lunch' | 'phase3' | 'wrap';

export interface PhaseConfig {
  id: PhaseId;
  label: string;   // full label, e.g. "Phase 2 · Build"
  short: string;   // chip label, e.g. "BUILD"
  start: string;   // HH:MM, event-local time
  end: string;     // HH:MM, event-local time
  sub: string;     // one-line summary on the landing timeline
  line: string;    // longer description on the landing timeline
  highlights: string[];
  tint: string;
}

export interface Voice {
  name: string;
  role: string;
  quote: string;
  accent: string;
}

const DEFAULT_DATE = '2026-12-12';
const EVENT_TZ = '+05:30';

function tzOffsetMinutes(tz: string): number {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(tz);
  if (!m) return 0;
  const mins = Number(m[2]) * 60 + Number(m[3]);
  return m[1] === '-' ? -mins : mins;
}

function resolveDate(): string {
  const env = process.env.NEXT_PUBLIC_EVENT_DATE?.trim();
  if (!env) return DEFAULT_DATE;
  if (env.toLowerCase() === 'today') {
    // Anchor to "today" in the event's own timezone so the demo is always live.
    const local = new Date(Date.now() + tzOffsetMinutes(EVENT_TZ) * 60_000);
    return local.toISOString().slice(0, 10);
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(env) ? env : DEFAULT_DATE;
}

export const EVENT = {
  /** Big wordmark on the landing / projector. The last letter gets the brand gradient. */
  wordmark: 'LAUNCHPAD',
  /** Small chip next to the wordmark. Empty string hides it. */
  edition: "'26",
  /** Full human name used in titles, footers and photo frames. */
  name: "Launchpad '26",
  kind: 'Innovation Showcase',
  tagline: 'Powerful ideas and the future you can build.',
  organizer: 'The Launchpad organising team',

  date: resolveDate(),
  /** UTC offset of the venue, used to anchor the schedule. */
  tz: EVENT_TZ,
  tzLabel: 'IST',

  /** How many teams the event is built for. Drives "x of N" counters. */
  expectedTeams: 24,
  durationLabel: 'Six hours',

  /** Fallback host for QR codes when window.location is unavailable. */
  fallbackHost: 'localhost:3000',

  /** Prefix for localStorage keys + cookies so two Hostify events on one domain never collide. */
  storagePrefix: 'hostify',

  schedule: [
    {
      id: 'phase1', label: 'Phase 1 · Welcome', short: 'WELCOME', start: '09:30', end: '10:45',
      sub: 'Doors open. Welcome. Seat allotments.',
      line: 'Teams arrive, settle in, and meet the day.',
      highlights: ['Registration', 'Opening address', 'Seat allotments'],
      tint: '#4F46E5',
    },
    {
      id: 'phase2', label: 'Phase 2 · Build', short: 'BUILD', start: '10:45', end: '13:00',
      sub: 'Brainstorm. Prototype. Sharpen the pitch.',
      line: 'Just over two hours of crafted chaos: prompts, missions, and a spotlight moment from the stage.',
      highlights: ['Networking bingo', 'Photo booth', 'Team wall', 'Connect', 'Spotlight'],
      tint: '#06B6D4',
    },
    {
      id: 'lunch', label: 'Lunch · Reset & Recharge', short: 'LUNCH', start: '13:00', end: '14:00',
      sub: 'Catch your breath. Eat warm food.',
      line: 'The one hour of the day where nobody is keeping score.',
      highlights: ['Reset', 'Recharge'],
      tint: '#F59E0B',
    },
    {
      id: 'phase3', label: 'Phase 3 · Judging', short: 'JUDGE', start: '14:00', end: '15:45',
      sub: 'Present. Get judged. Land it.',
      line: 'Five criteria, a full panel, one audience. Sometimes the audience out-votes everyone.',
      highlights: ['Team presentations', 'Judge scoring', 'Audience reactions'],
      tint: '#7C3AED',
    },
    {
      id: 'wrap', label: 'Wrap · Thanks & Awards', short: 'AWARDS', start: '15:45', end: '16:15',
      sub: 'Vote of thanks. Awards. The long exhale.',
      line: 'The podium reveal, live on every screen in the room.',
      highlights: ['Closing address', 'Awards ceremony', 'Group photo'],
      tint: '#EF4444',
    },
  ] satisfies PhaseConfig[],

  /**
   * Projector carousel message slots. Slot keys are fixed (they're data
   * paths); the labels are yours. Coordinators write the text live from /console.
   */
  messageSlots: {
    faculty:      { label: 'From the host',            defaultRole: 'Host',            hint: 'A few sentences from the host or chief patron. Keep it 60-120 words; it will be read from the back of the room.' },
    hod:          { label: 'From the chief guest',     defaultRole: 'Chief Guest',     hint: 'A short message from the chief guest. Welcoming, ambitious, brief.' },
    studentCoord: { label: 'From the organising team', defaultRole: 'Organising Team', hint: 'A peer-to-peer note from the organisers. Energetic. Specific.' },
  },

  /** Welcome notes on the landing page. Sample content: replace with your own people. */
  voices: [
    {
      name: 'Alex Rivera',
      role: 'Event Director',
      quote: 'Innovation begins where curiosity refuses to settle. Today every team here gets to prove that the future doesn’t wait for permission. It builds, it questions, it ships.',
      accent: '#6366F1',
    },
    {
      name: 'Sam Chen',
      role: 'Programme Lead',
      quote: 'What you build today won’t be remembered for being perfect. It’ll be remembered for being yours. Take the prompts seriously; take yourselves a little less so.',
      accent: '#A78BFA',
    },
    {
      name: 'Jordan Patel',
      role: 'Organising Team',
      quote: 'This day started as a sketch in a notebook months ago. Seeing teams walk in with ideas of their own is the only metric that matters.',
      accent: '#22D3EE',
    },
    {
      name: 'Morgan Lee',
      role: 'Organising Team',
      quote: 'The hardest part of any event is the moment before doors open. Here’s to the easy bit in between. Have at it.',
      accent: '#FBBF24',
    },
  ] satisfies Voice[],
};

// ─── Derived helpers ─────────────────────────────────────────────────────────

/** Epoch ms for an HH:MM time on the event date, in the event timezone. */
export function eventTime(hhmm: string): number {
  return new Date(`${EVENT.date}T${hhmm}:00${EVENT.tz}`).getTime();
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const [Y, M, D] = EVENT.date.split('-').map(Number);

/** e.g. "12 December 2026" */
export const EVENT_DATE_LONG = `${D} ${MONTHS[M - 1]} ${Y}`;
/** e.g. "12 Dec" */
export const EVENT_DATE_SHORT = `${D} ${MONTHS[M - 1].slice(0, 3)}`;
/** e.g. "12.12.26" */
export const EVENT_DATE_DOTTED = `${String(D).padStart(2, '0')}.${String(M).padStart(2, '0')}.${String(Y).slice(2)}`;
/** e.g. "Saturday" */
export const EVENT_WEEKDAY = WEEKDAYS[new Date(Date.UTC(Y, M - 1, D)).getUTCDay()];

export const DOORS_TIME = EVENT.schedule[0].start;
export const STAGE_TIME = EVENT.schedule[0].end;
export const WRAP_TIME = EVENT.schedule[EVENT.schedule.length - 1].end;

/** "09:30" → "9:30 AM" */
export function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 24 → "twenty-four". Falls back to digits for 100+. */
export function numberWord(n: number): string {
  if (n < 0 || n >= 100 || !Number.isInteger(n)) return String(n);
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  return n % 10 === 0 ? t : `${t}-${ONES[n % 10]}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Namespaced key for localStorage / cookies. */
export function storageKey(key: string): string {
  return `${EVENT.storagePrefix}.${key}`;
}
