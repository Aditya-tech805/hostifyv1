// LocalStorage keys — kept in one place, namespaced by the event's storagePrefix.

import { storageKey } from '@/config/event';

export const STORAGE_KEYS = {
  team:           storageKey('team'),
  mockTeams:      storageKey('mock-teams'),
  phaseOverride:  storageKey('phase-override'),
  coordAuth:      storageKey('coord-auth'),
  judgeAuth:      storageKey('judge-auth'),
  judgeName:      storageKey('judge-name'),
  judgeScores:    storageKey('judge-scores'),
  ideaCards:      storageKey('idea-cards'),
  pitchLab:       storageKey('pitch-lab'),
  bingo:          storageKey('bingo'),
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
