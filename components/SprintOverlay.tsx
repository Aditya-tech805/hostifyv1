'use client';

import { useEffect, useState } from 'react';
import { useSprint, useSprintSubmissions } from '@/lib/data';
import { pad } from '@/lib/schedule';

/**
 * Full-screen sprint stage for the projector. Renders nothing when no
 * sprint is active. While the timer runs, shows prompt + countdown +
 * a live stream of incoming team submissions ticker-style. When the
 * timer ends, switches to a reveal layout showing all submissions
 * gridded out for the coordinator to call winners.
 */
export function SprintOverlay() {
  const [sprint] = useSprint();
  const subs = useSprintSubmissions();
  const [, setTick] = useState(0);

  // Tick to update countdown
  useEffect(() => {
    if (!sprint) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [sprint]);

  if (!sprint) return null;

  const now = Date.now();
  const remaining = Math.max(0, sprint.endsAt - now);
  const inComposeWindow = remaining > 0;

  return (
    <div className="fixed inset-0 z-[280] flex flex-col items-center justify-center overflow-y-auto bg-bg/85 px-6 py-10 backdrop-blur-2xl animate-fade-in" style={{ backgroundImage: 'radial-gradient(ellipse 50% 40% at 20% 20%, rgba(245,158,11,0.18), transparent 70%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(79,70,229,0.16), transparent 70%)' }}>
      {/* Eyebrow + prompt */}
      <div className="mb-5 inline-flex items-center rounded-full border border-spark/40 bg-spark/[0.10] px-5 py-2 font-mono text-[clamp(12px,1.3vw,16px)] uppercase tracking-[0.32em] text-spark">
        <span className="mr-3 inline-block h-2 w-2 animate-pulse-soft rounded-full bg-spark" />
        {inComposeWindow ? 'Speed Idea Sprint · LIVE' : 'Sprint · Submissions in'}
      </div>
      <h1 className="mb-3 max-w-[1200px] text-center font-display text-[clamp(36px,5.5vw,86px)] font-bold leading-[1.05] tracking-tight">
        {sprint.prompt}
      </h1>

      {/* Countdown OR submissions count */}
      {inComposeWindow ? (
        <CountdownDisplay remainingMs={remaining} totalMs={sprint.durationMs} subCount={subs.length} />
      ) : (
        <div className="mb-6 font-mono text-[clamp(11px,1vw,14px)] uppercase tracking-[0.32em] text-mute">
          {subs.length} {subs.length === 1 ? 'submission' : 'submissions'} · coordinator picks winners
        </div>
      )}

      {/* Submissions grid */}
      {subs.length > 0 ? (
        <div className="grid w-full max-w-[1400px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subs.map((s, i) => {
            const isWinner = sprint.winners?.includes(s.teamId);
            return (
              <div
                key={s.teamId}
                className={`animate-pop-in overflow-hidden rounded-2xl border bg-surface p-5 ${
                  isWinner ? 'border-accent shadow-glow-cyan' : 'border-line shadow-soft'
                }`}
                style={{
                  borderLeftColor: s.teamColor,
                  borderLeftWidth: 6,
                  animationDelay: `${Math.min(i * 60, 800)}ms`,
                  animationFillMode: 'both',
                }}
              >
                <div className="mb-2 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.18em] text-mute">
                  <span style={{ color: s.teamColor }}>{s.teamName}</span>
                  {isWinner && <span className="text-accent">★ winner</span>}
                </div>
                <div className="font-display text-[clamp(15px,1.4vw,22px)] font-medium leading-snug tracking-tight">
                  {s.text}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="font-mono text-[clamp(12px,1.4vw,18px)] uppercase tracking-[0.32em] text-mute">
          {inComposeWindow ? 'Submissions appearing here in real time…' : 'No submissions came in.'}
        </div>
      )}
    </div>
  );
}

function CountdownDisplay({ remainingMs, totalMs, subCount }: { remainingMs: number; totalMs: number; subCount: number }) {
  const totalSec = Math.ceil(remainingMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const pct = (1 - remainingMs / totalMs) * 100;
  const danger = remainingMs < 30_000;

  return (
    <div className="my-6 flex flex-col items-center">
      <div className={`font-mono text-[clamp(80px,10vw,160px)] font-bold leading-none tracking-tight ${danger ? 'text-spark' : 'text-accent'}`}>
        {pad(m)}:{pad(s)}
      </div>
      <div className="mt-3 h-1.5 w-[clamp(280px,40vw,560px)] overflow-hidden rounded-full bg-surface">
        <div className={`h-full transition-all duration-300 ${danger ? 'bg-spark' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 font-mono text-[clamp(11px,1vw,14px)] uppercase tracking-[0.32em] text-mute">
        {subCount} {subCount === 1 ? 'team has' : 'teams have'} submitted
      </div>
    </div>
  );
}
