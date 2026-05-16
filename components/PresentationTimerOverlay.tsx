'use client';

import { useEffect, useRef, useState } from 'react';
import { useTimer } from '@/lib/data';
import { pad } from '@/lib/schedule';

/**
 * Big projector-style countdown timer. Renders nothing when no timer is
 * active. Beeps once when 30 seconds remain.
 */
export function PresentationTimerOverlay() {
  const [timer] = useTimer();
  const [, setTick] = useState(0);
  const beepedRef = useRef<string | null>(null); // timer.startedAt that already beeped

  // Re-render every 250ms so the countdown ticks smoothly
  useEffect(() => {
    if (!timer) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [timer]);

  if (!timer) return null;

  // Compute remaining
  const now = Date.now();
  let remainingMs: number;
  if (timer.startedAt == null) {
    remainingMs = timer.remainingMs; // paused
  } else {
    remainingMs = timer.remainingMs - (now - timer.startedAt);
  }
  if (remainingMs < 0) remainingMs = 0;

  const totalSec = Math.ceil(remainingMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const isPaused = timer.startedAt == null;
  const isOver = remainingMs <= 0;
  const danger = !isPaused && !isOver && remainingMs < 30_000;

  // 30s warning beep — once per timer instance
  useEffect(() => {
    if (!timer) return;
    if (isPaused || isOver) return;
    if (beepedRef.current === String(timer.startedAt)) return;
    if (remainingMs < 30_000 && remainingMs > 28_500) {
      beepedRef.current = String(timer.startedAt);
      try {
        // Generate a short beep with the Web Audio API — no asset file needed
        const AudioCtx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
        const ctx = new AudioCtx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 880;
        o.type = 'sine';
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        o.start(); o.stop(ctx.currentTime + 0.65);
      } catch { /* ignore — some browsers block audio without user gesture */ }
    }
  }, [timer, isPaused, isOver, remainingMs]);

  const tone = isOver ? 'text-spark' : danger ? 'text-spark' : 'text-accent';

  return (
    <div className="pointer-events-none fixed bottom-8 left-1/2 z-40 -translate-x-1/2 select-none">
      <div className={`rounded-3xl border ${danger ? 'border-spark bg-spark/[0.10] shadow-glow' : 'border-line bg-white shadow-glow'} px-10 py-6 backdrop-blur-xl`}>
        <div className="font-mono text-[clamp(11px,1vw,14px)] uppercase tracking-[0.32em] text-mute text-center">
          {timer.label || (isOver ? "Time's up" : isPaused ? 'Paused' : 'Time remaining')}
        </div>
        <div className={`font-mono text-[clamp(72px,9vw,140px)] font-bold leading-none tracking-tight ${tone}`}>
          {pad(m)}:{pad(s)}
        </div>
      </div>
    </div>
  );
}
