'use client';

import Link from 'next/link';
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

/** Friendly explanations for activities that have no destination page. */
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
      // No destination page → it's a passive moment triggered by the coordinator.
      // Show a friendlier note rather than the misleading "coming soon".
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
      className={`relative flex min-h-[124px] flex-col justify-between rounded-[18px] border bg-surface p-[18px] text-left transition-all duration-200 ${
        unlocked
          ? 'border-line hover:-translate-y-0.5 hover:border-primary hover:bg-gradient-to-b hover:from-surface hover:to-surface-2'
          : 'cursor-not-allowed border-line opacity-55'
      }`}
    >
      <div>
        <span className="mb-2 inline-block text-[22px]">{icon}</span>
        <h3 className="font-display text-[15px] font-semibold leading-tight tracking-tight">
          {title}
        </h3>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{description}</p>
      </div>
      {!unlocked && (
        <span className="absolute right-4 top-4 text-sm opacity-60">🔒</span>
      )}
      {unlocked && route && (
        <span className="absolute right-3 top-3 rounded bg-accent px-1.5 py-[3px] font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-bg">
          LIVE
        </span>
      )}
    </button>
  );
}
