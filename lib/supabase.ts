// ─────────────────────────────────────────────────────────────────────────────
// Supabase client initialization.
// Gracefully falls back to localStorage-only mode if env vars are missing,
// so the entire app remains usable in dev without Supabase setup.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when env vars are set. Components branch on this. */
export const SUPABASE_ENABLED = !!(url && anonKey);

/** Table used as a hierarchical key/value store. See README for the migration. */
export const KV_TABLE = 'kv';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_ENABLED) return null;
  if (typeof window === 'undefined') return null; // never init on server
  if (_client) return _client;
  _client = createClient(url!, anonKey!, {
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return _client;
}
