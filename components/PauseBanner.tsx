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
    <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-bg/95 px-6 backdrop-blur-md animate-fade-in">
      <div className="mb-6 inline-flex items-center rounded-full border border-spark/40 bg-spark/[0.10] px-5 py-2 font-mono text-[12px] uppercase tracking-[0.32em] text-spark">
        <span className="mr-3 inline-block h-2 w-2 animate-pulse-soft rounded-full bg-spark" />
        Paused by coordinator
      </div>
      <h1 className="text-center font-display text-[clamp(40px,8vw,84px)] font-bold leading-[1.05] tracking-tight">
        Sit tight.
      </h1>
      <p className="mt-4 max-w-[420px] text-center text-[15px] leading-relaxed text-ink-2">
        The coordinator has paused the activities. Your progress is saved — we&apos;ll be back in a moment.
      </p>
    </div>
  );
}
