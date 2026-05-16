'use client';

import { useEffect, useState } from 'react';
import { getPhaseState, type PhaseState, type PhaseId } from './schedule';
import { STORAGE_KEYS, readString } from './storage';

/**
 * Live event clock + phase state. Re-renders every second.
 * Honours the coordinator phase override stored in localStorage.
 *
 * `mounted` indicates the client has hydrated and `now` reflects real time.
 * Before mount we return a deterministic sentinel timestamp so SSR and the
 * initial client render produce identical HTML (avoids hydration mismatch
 * warnings). Components that show wall-clock values can show "--:--"
 * placeholders while !mounted to avoid a brief flash of the sentinel time.
 */
export function useEventPhase(intervalMs: number = 1000): { now: Date; state: PhaseState; mounted: boolean } {
  // Sentinel: a fixed pre-event timestamp. Both SSR and first client render
  // see this exact value, so React's hydration check passes.
  const [now, setNow] = useState<Date>(() => new Date(2025, 0, 1));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(new Date()); // swap to real time immediately on mount
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  // Read override fresh on every tick so override changes propagate.
  const override = (typeof window !== 'undefined'
    ? (readString(STORAGE_KEYS.phaseOverride) as PhaseId | null)
    : null);
  const state = getPhaseState(now, override);
  return { now, state, mounted };
}

/** Mirror a localStorage key into state, with cross-tab sync via `storage` event. */
export function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    // Hydrate from storage on mount
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch { /* ignore */ }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      try { setValue(e.newValue != null ? (JSON.parse(e.newValue) as T) : initial); }
      catch { /* ignore */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = (v: T) => {
    setValue(v);
    try { window.localStorage.setItem(key, JSON.stringify(v)); }
    catch { /* ignore */ }
  };

  return [value, update];
}
