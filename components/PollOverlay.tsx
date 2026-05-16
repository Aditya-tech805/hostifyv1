'use client';

import { useMemo } from 'react';
import { usePoll, usePollSubmissions } from '@/lib/data';

/**
 * Word-cloud projector overlay. Renders nothing when no poll is active.
 * Counts word frequency from all device submissions and sizes each word
 * proportionally — biggest most-popular word in the centre, others
 * splashed around in random positions.
 */
export function PollOverlay() {
  const [poll] = usePoll();
  const subs = usePollSubmissions();

  // Aggregate: lowercase the words, count occurrences
  const cloud = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(subs).forEach((word) => {
      const w = String(word ?? '').trim().toLowerCase();
      if (!w) return;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [subs]);

  if (!poll) return null;

  const maxCount = cloud[0]?.[1] ?? 1;
  const colors = ['#7c3aed', '#84cc16', '#f97316', '#0ea5e9', '#f43f5e', '#fbbf24', '#a78bfa'];

  return (
    <div className="fixed inset-0 z-[290] flex flex-col items-center justify-center overflow-hidden bg-bg/85 px-6 backdrop-blur-2xl animate-fade-in" style={{ backgroundImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(6,182,212,0.18), transparent 70%), radial-gradient(ellipse 50% 50% at 50% 100%, rgba(79,70,229,0.16), transparent 70%)' }}>
      <div className="mb-6 inline-flex items-center rounded-full border border-accent/40 bg-accent/[0.08] px-5 py-2 font-mono text-[clamp(12px,1.3vw,16px)] uppercase tracking-[0.32em] text-accent">
        <span className="mr-3 inline-block h-2 w-2 animate-pulse-soft rounded-full bg-accent" />
        Live poll
      </div>
      <h2 className="mb-2 max-w-[1100px] text-center font-display text-[clamp(40px,5vw,80px)] font-bold leading-tight tracking-tight">
        {poll.question}
      </h2>
      <div className="mb-10 font-mono text-[clamp(11px,1vw,14px)] uppercase tracking-[0.32em] text-mute">
        {cloud.length} {cloud.length === 1 ? 'response' : 'unique responses'} · {Object.values(subs).length} total taps
      </div>

      <div className="flex max-w-[1400px] flex-wrap items-center justify-center gap-x-6 gap-y-3 px-8">
        {cloud.map(([word, count], i) => {
          const ratio = count / maxCount;
          const fontSize = `clamp(${22 + ratio * 30}px, ${1.5 + ratio * 4}vw, ${44 + ratio * 70}px)`;
          const color = colors[i % colors.length];
          return (
            <span
              key={word}
              className="select-none font-display font-bold tracking-tight animate-pop-in"
              style={{
                fontSize,
                color,
                opacity: 0.45 + ratio * 0.55,
                animationDelay: `${i * 40}ms`,
                animationFillMode: 'both',
              }}
            >
              {word}
            </span>
          );
        })}
        {cloud.length === 0 && (
          <div className="font-mono text-[clamp(12px,1.4vw,18px)] uppercase tracking-[0.32em] text-mute">
            Waiting for the first response…
          </div>
        )}
      </div>
    </div>
  );
}
