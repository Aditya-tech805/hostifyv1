// LocalStorage keys — kept in one place so we can swap to Firebase cleanly later.

export const STORAGE_KEYS = {
  team:           'innovatrix26.team',
  mockTeams:      'innovatrix26.mock-teams',
  phaseOverride:  'innovatrix26.phase-override',
  coordAuth:      'innovatrix26.coord-auth',
  judgeAuth:      'innovatrix26.judge-auth',
  judgeName:      'innovatrix26.judge-name',
  judgeScores:    'innovatrix26.judge-scores',
  ideaCards:      'innovatrix26.idea-cards',
  pitchLab:       'innovatrix26.pitch-lab',
  bingo:          'innovatrix26.bingo',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Read JSON from localStorage. Returns `fallback` on parse error / missing key
 * or when running on the server.
 */
export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw == null) return fallback;
  try { return JSON.parse(raw) as T; }
  catch { return fallback; }
}

export function writeJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readString(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
}

export function writeString(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value);
}

export function removeKey(key: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
}
