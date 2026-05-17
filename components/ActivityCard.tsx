'use client';

import { useRouter } from 'next/navigation';
import { ACTIVITY_PHASES, ACTIVITY_ROUTES, type ActivityId } from '@/lib/activities';
import { useEventPhase } from '@/lib/hooks';
import { usePreviewMode } from '@/lib/data';
import { useToast } from './Toast';

interface ActivityCardProps {
  id: ActivityId;
  icon: string;
  title: string;
  description: string;
}

const PHASE_LABEL: Record<string, string> = {
  phase1: 'Phase 1',
  phase2: 'Phase 2',
  lunch:  'Lunch',
  phase3: 'Phase 3',
  wrap:   'Wrap',
};

const PASSIVE_MESSAGES: Partial<Record<ActivityId, string>> = {
  spotlight: 'Spotlight is triggered by the coordinator — appears on every device automatically when they spin the wheel (~1 PM).',
};

export function ActivityCard({ id, icon, title, description }: ActivityCardProps) {
  const router = useRouter();
  const { state } = useEventPhase();
  const [previewMode] = usePreviewMode();
  const { push: toast } = useToast();

  const allowed = ACTIVITY_PHASES[id] ?? [];
  const livePhaseId = state.status === 'live' || state.status === 'override' ? state.phase?.id : null;
  const unlocked = previewMode || (!!livePhaseId && allowed.includes(livePhaseId));
  const route = ACTIVITY_ROUTES[id];

  const onClick = () => {
    if (!unlocked) {
      const where = allowed.map((p) => PHASE_LABEL[p]).join(' / ');
      toast(where ? `Unlocks in ${where}.` : 'Coming soon.');
      return;
    }
    if (!route) {
      const msg = PASSIVE_MESSAGES[id] ?? 'This one happens automatically — no need to open it.';
      toast(msg);
      return;
    }
    router.push(route);
  };

  return (
    <button
      onClick={onClick}
      aria-disabled={!unlocked}
      className={`group relative flex min-h-[124px] flex-col justify-between overflow-hidden rounded-2xl border p-[18px] text-left transition-all duration-200 ${
        unlocked
          ? 'border-line bg-surface shadow-soft hover:-translate-y-1 hover:border-primary/30 hover:shadow-glow'
          : 'cursor-not-allowed border-line bg-surface/60 opacity-60'
      }`}
    >
      {/* Subtle gradient blob in the corner of unlocked cards */}
      {unlocked && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-brand opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30"
        />
      )}
      <div className="relative">
        <span className="mb-2 inline-block text-[22px]">{icon}</span>
        <h3 className="font-display text-[15px] font-semibold leading-tight tracking-tight text-ink">
          {title}
        </h3>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{description}</p>
      </div>
      {!unlocked && (
        <span
          role="img"
          aria-label="Locked"
          title="Locked - opens later in the event"
          className="absolute right-4 top-4 text-sm opacity-60"
        >
          🔒
        </span>
      )}
      {unlocked && route && (
        <span className="absolute right-3 top-3 rounded bg-gradient-cyan px-1.5 py-[3px] font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white shadow-soft">
          LIVE
        </span>
      )}
    </button>
  );
}
