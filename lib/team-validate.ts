// ============================================================================
// Server-side team-field sanitization + validation.
//
// All writes to the teams/* paths go through the API routes (Phase 3),
// not direct client -> Supabase calls. This module is the single place that
// enforces what is actually allowed in a team payload: length caps, color
// allowlist, control-char stripping, member count.
//
// Keep this file pure / no imports from client modules. It is used by API
// routes that run in the Node runtime.
// ============================================================================

// The six brand colours a team can pick. Server-enforced.
// Clients cannot smuggle in their own hex.
// Kept in sync with TEAM_COLORS in lib/teams.ts - if you edit one, edit
// both. Hex values are case-sensitive (we compare exact strings).
export const ALLOWED_TEAM_COLORS = [
  '#6366F1', // indigo / primary
  '#A78BFA', // violet / secondary
  '#22D3EE', // cyan / accent
  '#FBBF24', // amber / spark
  '#84CC16', // lime
  '#F87171', // rose
] as const;

// Strip invisible / bidi-override / control characters before storing.
// The character class is built at runtime via uXXXX escapes so this source
// file itself stays pure ASCII (no hostile invisible chars hidden in our
// own codebase). Ranges covered:
//   u0000-u001F   C0 controls
//   u007F-u009F   DEL + C1 controls
//   u200B-u200F   zero-width space/joiner/non-joiner + LRM + RLM
//   u202A-u202E   LRE / RLE / PDF / LRO / RLO bidi-overrides
//   u2060-u206F   word joiner + invisible math operators
//   uFEFF         BOM / zero-width no-break space
const INVISIBLE_RE = new RegExp(
  '[' +
    '\\u0000-\\u001F' +
    '\\u007F-\\u009F' +
    '\\u200B-\\u200F' +
    '\\u202A-\\u202E' +
    '\\u2060-\\u206F' +
    '\\uFEFF' +
  ']',
  'g',
);

function sanitizeText(s: string, maxLen: number): string {
  return s
    .replace(INVISIBLE_RE, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export interface TeamFormFields {
  name: string;
  color: string;
  members: string[];
  idea: string;
}

// Coerce + clean any incoming object into the TeamFormFields shape.
export function sanitizeTeamFields(input: unknown): TeamFormFields {
  const obj = (input ?? {}) as Record<string, unknown>;
  return {
    name:  typeof obj.name  === 'string' ? sanitizeText(obj.name, 32)  : '',
    color: typeof obj.color === 'string' ? obj.color                    : '',
    members: Array.isArray(obj.members)
      ? (obj.members as unknown[])
          .filter((m): m is string => typeof m === 'string')
          .map((m) => sanitizeText(m, 40))
          .filter((m) => m.length > 0)
          .slice(0, 5)
      : [],
    idea: typeof obj.idea === 'string' ? sanitizeText(obj.idea, 140) : '',
  };
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateTeamFields(t: TeamFormFields): ValidationResult {
  if (t.name.length < 2) return { ok: false, error: 'Team name must be at least 2 characters.' };
  if (!(ALLOWED_TEAM_COLORS as readonly string[]).includes(t.color)) {
    return { ok: false, error: 'Invalid team color.' };
  }
  if (t.members.length < 1) return { ok: false, error: 'At least one member name required.' };
  if (t.idea.length < 10) return { ok: false, error: 'Idea must be at least 10 characters.' };
  return { ok: true };
}
