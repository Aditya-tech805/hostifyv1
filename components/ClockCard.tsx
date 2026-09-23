'use client';

import { ClientOnly } from './ClientOnly';
import { useEventPhase } from '@/lib/hooks';
import { formatCountdown, pad } from '@/lib/schedule';
import { EVENT, EVENT_DATE_SHORT, DOORS_TIME } from '@/config/event';

interface ClockCardProps {
  /** Smaller variant used in the participant dashboard. */
  compact?: boolean;
}

export function ClockCard({ compact = false }: ClockCardProps) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <div>
        <ClientOnly
          fallback={
            <>
              <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-mute">···</div>
              <div className="font-display text-[18px] font-medium tracking-tight text-ink">···</div>
            </>
          }
        >
          <ClockBody />
        </ClientOnly>
      </div>
      <div className="text-right">
        <ClientOnly
          fallback={
            <>
              <div className={`font-mono font-semibold tracking-tight text-ink leading-none ${compact ? 'text-[22px]' : 'text-[26px]'}`}>--:--</div>
              <div className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">···</div>
            </>
          }
        >
          <WallClock compact={compact} />
        </ClientOnly>
      </div>
    </div>
  );
}

function ClockBody() {
  const { now, state } = useEventPhase();

  let label = '···';
  let value: React.ReactNode = '···';
  if (state.status === 'pre' && state.next) {
    label = 'Event starts in';
    const cd = formatCountdown(state.next.start - now.getTime());
    value = (
      <>
        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-semibold">{cd}</span>
        <span className="text-ink-2"> · {EVENT_DATE_SHORT}, {DOORS_TIME}</span>
      </>
    );
  } else if ((state.status === 'live' || state.status === 'override') && state.phase) {
    label = state.status === 'override' ? 'Override · current phase' : 'Right now';
    const cd = formatCountdown(state.phase.end - now.getTime());
    value = (
      <>
        {state.phase.short} · ends in <span className="text-primary font-semibold">{cd}</span>
      </>
    );
  } else if (state.status === 'post') {
    label = 'Thank you';
    value = `${EVENT.name} has concluded.`;
  }

  return (
    <>
      <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-mute">{label}</div>
      <div className="font-display text-[18px] font-medium tracking-tight text-ink">{value}</div>
    </>
  );
}

function WallClock({ compact }: { compact: boolean }) {
  const { now } = useEventPhase();
  return (
    <>
      <div className={`font-mono font-semibold tracking-tight text-ink leading-none ${compact ? 'text-[22px]' : 'text-[26px]'}`}>
        {`${pad(now.getHours())}:${pad(now.getMinutes())}`}
      </div>
      <div className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">
        {now.toLocaleDateString('en', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
      </div>
    </>
  );
}
