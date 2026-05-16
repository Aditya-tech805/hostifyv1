'use client';

import { useEffect, useState } from 'react';
import { useMentorPings, acknowledgeMentorPing, type MentorPing } from '@/lib/data';

interface MentorPingsBannerProps {
  /** Team to listen for pings on. Null = no-op. */
  teamId: string | null;
}

/**
 * Shows the newest unacknowledged mentor ping for this team as a top banner.
 * The team can dismiss with "Got it" (marks acknowledged). Vibrates on arrival.
 */
export function MentorPingsBanner({ teamId }: MentorPingsBannerProps) {
  const pings = useMentorPings(teamId);
  const lastPingIdRef = usePrev(pings[0]?.id);

  // Vibrate when a new ping arrives
  useEffect(() => {
    if (!pings.length) return;
    const newest = pings[0];
    if (newest.acknowledged) return;
    if (lastPingIdRef !== newest.id) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([60, 40, 120]);
      }
    }
  }, [pings, lastPingIdRef]);

  if (!teamId || !pings.length) return null;

  // Show the newest unacknowledged ping
  const unack = pings.find((p) => !p.acknowledged);
  if (!unack) return null;

  return <PingCard teamId={teamId} ping={unack} />;
}

function PingCard({ teamId, ping }: { teamId: string; ping: MentorPing }) {
  return (
    <div className="sticky top-[58px] z-40 mb-4 animate-fade-in border-b border-accent/20 bg-accent/[0.10] backdrop-blur-md">
      <div className="mx-auto max-w-[720px] px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-accent">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
            Mentor ping · {ping.from}
          </div>
          <button
            onClick={() => acknowledgeMentorPing(teamId, ping)}
            className="rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-white shadow-glow-cyan transition-all hover:bg-accent-2"
          >
            Got it
          </button>
        </div>
        <div className="mt-1.5 text-[14.5px] leading-relaxed text-ink">
          {ping.question}
        </div>
      </div>
    </div>
  );
}

/** Tracks the previous value of a single dep (avoids a useEffect-only signal). */
function usePrev<T>(value: T): T | undefined {
  const [prev, setPrev] = useState<T | undefined>(undefined);
  useEffect(() => { setPrev(value); }, [value]);
  return prev;
}
