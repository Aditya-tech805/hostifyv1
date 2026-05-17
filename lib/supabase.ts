// ─────────────────────────────────────────────────────────────────────────────
// Supabase client initialization.
//
// Picks up the per-role JWT issued by /api/auth/* (stored client-side via
// lib/auth-client.ts) and uses it as the Bearer token on both PostgREST and
// Realtime requests. That JWT carries an `app_role` claim that the Postgres
// RLS policies read to authorize each write.
//
// Falls back to localStorage-only mode when the env vars are missing, so the
// app remains demoable without Supabase setup.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readAppToken } from './auth-client';

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SUPABASE_ENABLED = !!(url && anonKey);
export const KV_TABLE = 'kv';

let _client: SupabaseClient | null = null;
let _clientToken: string | null = null;

/**
 * Singleton Supabase client. Rebuilt when the stored auth token changes —
 * supabase-js doesn't expose a clean runtime API for swapping the bearer
 * on both REST and Realtime, so a fresh client is the simplest correct
 * answer. The login/logout flows reload the page right after writing the
 * token, which sidesteps any subscription churn.
 */
export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_ENABLED) return null;
  if (typeof window === 'undefined') return null; // never init on server

  const appToken = readAppToken();
  const token = appToken?.token ?? null;

  if (_client && _clientToken === token) return _client;

  // Token (or null) changed — tear down old client.
  if (_client) {
    try { void _client.removeAllChannels(); } catch { /* ignore */ }
  }

  _client = createClient(url!, anonKey!, {
    realtime: { params: { eventsPerSecond: 20 } },
    global: token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {},
  });
  if (token) {
    // Realtime maintains its own auth state separate from REST headers.
    _client.realtime.setAuth(token);
  }
  _clientToken = token;
  return _client;
}
