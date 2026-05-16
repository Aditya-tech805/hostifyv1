'use client';

import { BrandMark } from './BrandMark';
import { ClientOnly } from './ClientOnly';
import { useEventPhase } from '@/lib/hooks';
import { formatCountdown } from '@/lib/schedule';

interface TopBarProps {
  /** Optional role tag (e.g. "Console", "Judge · Rahul") shown next to brand. */
  roleTag?: { text: string; tone: 'primary' | 'accent' };
  /** Optional right-side slot (e.g. "Sign out" button). */
  right?: React.ReactNode;
}

/**
 * Sticky glass top bar with brand, phase pill, and an optional right slot.
 * Phase pill switches between pre-event countdown, live phase label, and "complete".
 */
export function TopBar({ roleTag, right }: TopBarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[720px] items-center justify-between gap-3 px-5 py-3.5">
        <div className="flex items-center gap-2.5 font-display font-semibold tracking-tight text-ink">
          <BrandMark filled />
          <span>INNOVATRIX</span>
          <span className="rounded-full border border-line bg-surface px-2 py-[2px] font-mono text-[10.5px] tracking-[0.18em] text-mute">
            &apos;26
          </span>
          {roleTag && (
            <span
              className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] ${
                roleTag.tone === 'accent'
                  ? 'border-accent/40 bg-accent/[0.08] text-accent'
                  : 'border-primary/30 bg-primary/[0.08] text-primary'
              }`}
            >
              {roleTag.text}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!roleTag && (
            <ClientOnly
              fallback={
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-primary">
                  <span className="h-1.5 w-1.5 animate-dot-pulse rounded-full bg-primary" />
                  <span>···</span>
                </span>
              }
            >
              <PhasePill />
            </ClientOnly>
          )}
          {right}
        </div>
      </div>
    </header>
  );
}

function PhasePill() {
  const { now, state } = useEventPhase();
  let pillText = '···';
  if (state.status === 'pre' && state.next) {
    pillText = 'T–' + formatCountdown(state.next.start - now.getTime()).replace(/\s+\d+s$/, '');
  } else if ((state.status === 'live' || state.status === 'override') && state.phase) {
    pillText = state.phase.label;
  } else if (state.status === 'post') {
    pillText = 'Event complete';
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-primary">
      <span className="h-1.5 w-1.5 animate-dot-pulse rounded-full bg-primary" />
      <span>{pillText}</span>
    </span>
  );
}
