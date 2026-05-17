'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Client-side auth token storage.
//
// Holds the JWT returned by /api/auth/coordinator or /api/auth/judge.
// The token is then attached as a Bearer header on every Supabase request,
// so RLS policies can authorize the write based on `auth.jwt() ->> 'app_role'`.
// ─────────────────────────────────────────────────────────────────────────────

import type { AppRole } from './jwt';

export interface AppToken {
  token: string;
  /** Unix seconds. */
  exp: number;
  app_role: AppRole;
  judge_name?: string;
  team_id?: string;
}

const KEY = 'innovatrix26.app-token';

export function readAppToken(): AppToken | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppToken;
    if (
      typeof parsed.token !== 'string' ||
      typeof parsed.exp !== 'number' ||
      parsed.exp < Math.floor(Date.now() / 1000)
    ) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(KEY);
    return null;
  }
}

export function writeAppToken(t: AppToken): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(t));
}

export function clearAppToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}

export function hasRole(role: AppRole): boolean {
  return readAppToken()?.app_role === role;
}
