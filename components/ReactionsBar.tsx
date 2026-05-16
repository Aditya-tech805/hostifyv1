'use client';

import { useBroadcast } from '@/lib/sync';
import type { ReactionMsg } from './ReactionsLayer';

const REACTIONS = ['🤩', '🔥', '👏', '💡', '🎯', '🙌'];

/**
 * Compact emoji bar — tap any reaction to fire an emoji into the projector
 * via Supabase broadcast. Used on the audience vote view (and could be
 * added anywhere else during Phase 3).
 */
export function ReactionsBar() {
  // useBroadcast returns a sender; we don't care about receiving on participant
  const send = useBroadcast<ReactionMsg>('reactions', () => {});

  const fire = (emoji: string) => {
    const msg: ReactionMsg = {
      emoji,
      at: Date.now(),
      id: 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    };
    send(msg);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(15);
  };

  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-mute">
        React in real time · taps show on the big screen
      </div>
      <div className="grid grid-cols-6 gap-2">
        {REACTIONS.map((e) => (
          <button
            key={e}
            onClick={() => fire(e)}
            className="flex h-14 items-center justify-center rounded-xl border border-line bg-surface-2 text-3xl transition-all hover:-translate-y-0.5 hover:border-accent active:scale-95"
            aria-label={`React with ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
