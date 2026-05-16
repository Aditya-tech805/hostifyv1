'use client';

import { useEffect, useRef, useState } from 'react';
import { useSpotlight, setSpotlight, usePreviewMode } from '@/lib/data';
import { useAllTeams } from '@/lib/data';
import { useEventPhase } from '@/lib/hooks';
import type { Team } from '@/lib/teams';

const SPIN_DURATION_MS = 4200;

/**
 * Renders nothing when no spotlight is active. When the coordinator pushes a
 * spotlight, this overlay takes over the screen on every device — spinning
 * names rapidly, then settling on the 3 picked teams with a soft reveal.
 *
 * Spin animation is purely local (each device runs the same animation against
 * the same spinId). After SPIN_DURATION_MS, the final reveal stays visible.
 */
export function SpotlightOverlay() {
  const [spotlight] = useSpotlight();
  const teams = useAllTeams();
  const { state: eventState } = useEventPhase();
  const [previewMode] = usePreviewMode();
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'revealed'>('idle');
  const [rollIdx, setRollIdx] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // Spotlight should only be visible during Phase 2 (its natural slot)
  // or when preview mode is on for testing. Outside that window we ignore
  // any leftover state in Supabase so a stale test spin doesn't pop up
  // on participants' phones outside event hours.
  const phaseId =
    eventState.status === 'live' || eventState.status === 'override'
      ? eventState.phase?.id
      : null;
  const contextAllowsSpotlight = previewMode || phaseId === 'phase2';

  // Resolve teamIds → Team objects
  const picked: Team[] = spotlight
    ? spotlight.teamIds.map((id) => teams.find((t) => t.id === id)).filter((t): t is Team => !!t)
    : [];

  // Run spin animation whenever spinId changes
  useEffect(() => {
    if (!spotlight) {
      setPhase('idle');
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      return;
    }
    setPhase('spinning');
    setRollIdx(0);

    if (intervalRef.current) window.clearInterval(intervalRef.current);
    // Slow the roll over time so it feels like a wheel decelerating
    let elapsed = 0;
    let tickMs = 60;
    const tick = () => {
      setRollIdx((i) => i + 1);
      elapsed += tickMs;
      if (elapsed > SPIN_DURATION_MS * 0.55) tickMs = 120;
      if (elapsed > SPIN_DURATION_MS * 0.75) tickMs = 200;
      if (elapsed > SPIN_DURATION_MS * 0.90) tickMs = 320;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = window.setTimeout(tick, tickMs);
    };
    intervalRef.current = window.setTimeout(tick, tickMs);

    timeoutRef.current = window.setTimeout(() => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      setPhase('revealed');
    }, SPIN_DURATION_MS);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [spotlight?.spinId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!spotlight) return null;
  if (!contextAllowsSpotlight) return null;

  // During spin, cycle through team names. Once revealed, lock to the 3 picks.
  const rolling: string =
    teams.length > 0 && phase === 'spinning'
      ? teams[rollIdx % teams.length].name
      : '';

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden bg-bg/85 px-5 backdrop-blur-2xl animate-fade-in" style={{ backgroundImage: 'radial-gradient(ellipse 50% 60% at 25% 30%, rgba(245,158,11,0.18), transparent 70%), radial-gradient(ellipse 50% 60% at 75% 70%, rgba(124,58,237,0.16), transparent 70%)' }}>
      <div className="mb-8 inline-flex items-center rounded-full border border-spark/40 bg-spark/[0.10] px-5 py-2 font-mono text-[14px] uppercase tracking-[0.32em] text-spark">
        <span className="mr-3 inline-block h-2 w-2 animate-pulse-soft rounded-full bg-spark" />
        Spotlight · Phase 2
      </div>

      {phase === 'spinning' ? (
        <>
          <h1
            key={rollIdx}
            className="bg-gradient-to-b from-ink to-ink/55 bg-clip-text font-display text-[clamp(56px,11vw,140px)] font-bold leading-none tracking-tight text-transparent animate-pop-in"
          >
            {rolling || '···'}
          </h1>
          <div className="mt-8 font-mono text-[clamp(12px,1.4vw,16px)] uppercase tracking-[0.32em] text-mute">
            Picking three teams…
          </div>
        </>
      ) : (
        <>
          <h1 className="mb-2 bg-gradient-to-b from-ink to-ink/65 bg-clip-text text-center font-display text-[clamp(36px,5vw,64px)] font-bold leading-tight tracking-tight text-transparent">
            Three teams chosen.
          </h1>
          <p className="mb-10 max-w-[680px] text-center text-[clamp(15px,1.6vw,20px)] text-ink-2">
            90 seconds each. Tell us what you&apos;ve discovered, what you&apos;re building, what you need help with.
          </p>
          <div className="grid w-full max-w-[1200px] grid-cols-1 gap-4 sm:grid-cols-3">
            {picked.map((t, i) => (
              <div
                key={t.id}
                className="animate-pop-in overflow-hidden rounded-2xl border border-line-2 p-6 text-left"
                style={{
                  background: `linear-gradient(140deg, ${t.color}, color-mix(in srgb, ${t.color} 55%, #0a0a0f))`,
                  animationDelay: `${i * 200}ms`,
                  animationFillMode: 'both',
                }}
              >
                <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/75">
                  Pick #{i + 1}
                </div>
                <h3 className="font-display text-[clamp(24px,2.5vw,32px)] font-semibold leading-tight tracking-tight text-white">
                  {t.name}
                </h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-white/95">&ldquo;{t.idea}&rdquo;</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setSpotlight(null)}
            className="mt-10 rounded-full border border-line bg-transparent px-5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-mute transition-colors hover:border-line-2 hover:text-ink-2"
          >
            Dismiss (only coordinator should use this)
          </button>
        </>
      )}
    </div>
  );
}
