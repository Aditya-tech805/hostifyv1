'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Unified data layer: Supabase realtime when configured, localStorage otherwise.
// All app pages use these hooks — they never touch Supabase or localStorage
// directly. This means turning Supabase on/off is purely an env-var change.
//
// Storage model (Supabase): a single hierarchical key/value table called `kv`
// with columns (path TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ).
// Paths use '/' as a separator, e.g. "teams/abc-123" → one team row, or
// "phaseOverride" → a single scalar.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { SUPABASE_ENABLED, KV_TABLE, getSupabase } from './supabase';

// ─── Single-value hook ───────────────────────────────────────────────────────
/**
 * Subscribe to a single path. When Supabase is enabled, uses a filtered
 * realtime subscription. When not, falls back to localStorage with cross-tab
 * sync via the `storage` event.
 */
export function useSyncedValue<T>(path: string, fallback: T): [T, (v: T | null) => void, boolean] {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (SUPABASE_ENABLED) {
      const supabase = getSupabase();
      if (!supabase) return;

      // Initial fetch
      supabase.from(KV_TABLE).select('value').eq('path', path).maybeSingle()
        .then(({ data }) => {
          setValue(data?.value == null ? fallback : (data.value as T));
          setHydrated(true);
        });

      // Realtime subscription (filtered to this path).
      // Suffix with a random token so React Strict Mode's double-invocation
      // gets a fresh channel each run — Supabase caches channels by name,
      // and re-using a subscribed channel throws "cannot add callbacks ... after subscribe()".
      const channel = supabase
        .channel(`kv:${path}:${rand()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: KV_TABLE, filter: `path=eq.${path}` },
          (payload) => {
            const newRow = payload.new as { path: string; value: T } | null;
            if (payload.eventType === 'DELETE' || !newRow) setValue(fallback);
            else setValue(newRow.value == null ? fallback : newRow.value);
          },
        )
        .subscribe();

      return () => { void supabase.removeChannel(channel); };
    }

    // ── Fallback: localStorage ───────────────────────────────────────────────
    const key = lsKey(path);
    try {
      const raw = window.localStorage.getItem(key);
      setValue(raw == null ? fallback : (JSON.parse(raw) as T));
    } catch {
      setValue(fallback);
    }
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      try { setValue(e.newValue == null ? fallback : (JSON.parse(e.newValue) as T)); }
      catch { /* ignore */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const update = useCallback((next: T | null) => {
    void writeSynced(path, next);
    // Optimistic local update so the writer's own tab sees changes instantly
    // (Supabase realtime doesn't fire for the writer's own row in some cases).
    setValue(next == null ? fallback : next);
  }, [path, fallback]);

  return [value, update, hydrated];
}

// ─── Map (collection) hook ───────────────────────────────────────────────────
/**
 * Subscribe to all rows whose path starts with `${prefix}/`. Returns a
 * Record<childKey, T> where childKey is everything after the prefix slash.
 *
 * Used for collections like `teams`, `scores`, `audienceVotes`, `mentorPings`.
 */
export function useSyncedMap<T>(prefix: string): Record<string, T> {
  const [map, setMap] = useState<Record<string, T>>({});
  const prefixSlash = `${prefix}/`;

  useEffect(() => {
    if (SUPABASE_ENABLED) {
      const supabase = getSupabase();
      if (!supabase) return;

      // Initial fetch — all rows under this prefix
      supabase.from(KV_TABLE).select('path,value').like('path', `${prefix}/%`)
        .then(({ data }) => {
          if (!data) return;
          const next: Record<string, T> = {};
          for (const row of data as Array<{ path: string; value: T }>) {
            next[row.path.slice(prefixSlash.length)] = row.value;
          }
          setMap(next);
        });

      // Subscribe to ALL kv changes; filter to our prefix in JS.
      // Supabase realtime filters only support eq/neq/gt/lt — not LIKE —
      // so we have to receive everything and dispatch.
      // (random suffix avoids the channel-caching footgun under Strict Mode.)
      const channel = supabase
        .channel(`kv-map:${prefix}:${rand()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: KV_TABLE },
          (payload) => {
            const newRow = payload.new as { path: string; value: T } | null | undefined;
            const oldRow = payload.old as { path: string } | null | undefined;
            const path = newRow?.path ?? oldRow?.path;
            if (!path || !path.startsWith(prefixSlash)) return;
            const childKey = path.slice(prefixSlash.length);

            if (payload.eventType === 'DELETE' || !newRow) {
              setMap((m) => {
                const next = { ...m };
                delete next[childKey];
                return next;
              });
            } else {
              setMap((m) => ({ ...m, [childKey]: newRow.value }));
            }
          },
        )
        .subscribe();

      return () => { void supabase.removeChannel(channel); };
    }

    // ── Fallback: localStorage scan ──────────────────────────────────────────
    const prefixKey = `innovatrix26.sync.${prefix}/`;
    const scan = () => {
      const next: Record<string, T> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (!k?.startsWith(prefixKey)) continue;
        try {
          const v = window.localStorage.getItem(k);
          if (v != null) next[k.slice(prefixKey.length)] = JSON.parse(v);
        } catch { /* ignore */ }
      }
      setMap(next);
    };
    scan();
    const onStorage = (e: StorageEvent) => { if (e.key?.startsWith(prefixKey)) scan(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix]);

  return map;
}

// ─── Imperative write ────────────────────────────────────────────────────────
/** One-shot write (no subscription) — for callbacks that don't need the value. */
export async function writeSynced<T>(path: string, value: T | null): Promise<void> {
  if (SUPABASE_ENABLED) {
    const supabase = getSupabase();
    if (!supabase) return;
    if (value == null) {
      await supabase.from(KV_TABLE).delete().eq('path', path);
    } else {
      await supabase.from(KV_TABLE).upsert({ path, value }, { onConflict: 'path' });
    }
    return;
  }
  if (typeof window === 'undefined') return;
  const key = lsKey(path);
  if (value == null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, JSON.stringify(value));
}

// ─── Subscribe imperatively (outside React) ──────────────────────────────────
export function subscribeSynced<T>(path: string, onChange: (v: T | null) => void): () => void {
  if (SUPABASE_ENABLED) {
    const supabase = getSupabase();
    if (!supabase) return () => {};

    supabase.from(KV_TABLE).select('value').eq('path', path).maybeSingle()
      .then(({ data }) => onChange((data?.value ?? null) as T | null));

    const channel = supabase
      .channel(`kv-sub:${path}:${rand()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: KV_TABLE, filter: `path=eq.${path}` },
        (payload) => {
          const row = payload.new as { value: T } | null;
          if (payload.eventType === 'DELETE' || !row) onChange(null);
          else onChange(row.value);
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }
  if (typeof window === 'undefined') return () => {};
  const key = lsKey(path);
  const read = () => {
    const raw = window.localStorage.getItem(key);
    try { onChange(raw == null ? null : (JSON.parse(raw) as T)); }
    catch { onChange(null); }
  };
  read();
  const handler = (e: StorageEvent) => { if (e.key === key) read(); };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

function lsKey(path: string): string {
  return `innovatrix26.sync.${path}`;
}

/** Short random suffix for Supabase channel names — avoids cache collisions. */
function rand(): string {
  return Math.random().toString(36).slice(2, 8);
}
