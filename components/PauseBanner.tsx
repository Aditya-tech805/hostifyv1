'use client';

import { usePauseMode } from '@/lib/data';

/**
 * Full-page block when the coordinator has paused the event. Sits above
 * every participant page so taps land on the banner, not the underlying
 * UI. State below is preserved — pause is non-destructive.
 */
export function PauseBanner() {
  const [paused] = usePauseMode();
  if (!paused) return null;

  return (
    <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-white/85 px-6 backdrop-blur-2xl animate-fade-in">
      {/* Floating colour wash for visual interest */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-spark/20 blur-3xl animate-float-slow" />

      <div className="relative mb-6 inline-flex items-center rounded-full border border-spark/40 bg-spark/[0.10] px-5 py-2 font-mono text-[12px] uppercase tracking-[0.32em] text-spark backdrop-blur-md">
        <span className="mr-3 inline-block h-2 w-2 animate-pulse-soft rounded-full bg-spark" />
        Paused by coordinator
      </div>
      <h1 className="relative text-center font-display text-[clamp(40px,8vw,84px)] font-extrabold leading-[1.05] tracking-tight text-ink">
        Sit tight.
      </h1>
      <p className="relative mt-4 max-w-[420px] text-center text-[15px] leading-relaxed text-ink-2">
        The coordinator has paused the activities. Your progress is saved — we&apos;ll be back in a moment.
      </p>
    </div>
  );
}
