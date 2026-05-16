'use client';

import { useEffect, useState } from 'react';
import { useBroadcast } from '@/lib/sync';

export interface ReactionMsg {
  emoji: string;
  at: number;
  id: string;
}

interface FlyingEmoji {
  id: string;
  emoji: string;
  xPct: number;   // horizontal position (0–100)
  driftX: number; // sideways drift amount
  size: number;   // px
  duration: number; // ms
  spawnedAt: number;
}

/**
 * Background layer that listens for emoji reactions and flies them up the
 * screen Twitch-style. Renders nothing when idle. No DB writes — pure
 * Supabase broadcast.
 */
export function ReactionsLayer() {
  const [flying, setFlying] = useState<FlyingEmoji[]>([]);

  // Receive reactions via the shared broadcast channel
  useBroadcast<ReactionMsg>('reactions', (msg) => {
    const f: FlyingEmoji = {
      id: msg.id,
      emoji: msg.emoji,
      xPct: 12 + Math.random() * 76, // keep away from edges
      driftX: (Math.random() - 0.5) * 80,
      size: 48 + Math.random() * 36,
      duration: 3200 + Math.random() * 1400,
      spawnedAt: Date.now(),
    };
    setFlying((cur) => [...cur, f]);
  });

  // Drop emojis from state once their animation is done (keeps DOM small)
  useEffect(() => {
    if (flying.length === 0) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setFlying((cur) => cur.filter((f) => now - f.spawnedAt < f.duration + 200));
    }, 1000);
    return () => window.clearInterval(id);
  }, [flying.length]);

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {flying.map((f) => (
        <span
          key={f.id}
          className="absolute bottom-0 select-none"
          style={{
            left: `${f.xPct}%`,
            fontSize: f.size,
            animation: `react-rise ${f.duration}ms linear forwards`,
            // Pass per-instance drift to the keyframe via CSS variable
            ['--drift' as string]: `${f.driftX}px`,
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
          }}
        >
          {f.emoji}
        </span>
      ))}

      <style jsx>{`
        @keyframes react-rise {
          0%   { transform: translate3d(0, 0, 0) scale(0.4) rotate(-8deg); opacity: 0; }
          12%  { transform: translate3d(calc(var(--drift) * 0.15), -15vh, 0) scale(1) rotate(2deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translate3d(var(--drift), -110vh, 0) scale(0.85) rotate(-6deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
