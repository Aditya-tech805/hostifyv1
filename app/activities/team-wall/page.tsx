'use client';

import { useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { ParticipantSync } from '@/components/ParticipantSync';
import { ActivityHeader } from '@/components/ActivityHeader';
import { ToastProvider } from '@/components/Toast';
import { useAllTeams } from '@/lib/data';
import { readOwnTeam } from '@/lib/teams';
import { useEffect } from 'react';
import type { Team } from '@/lib/teams';

export default function TeamWallPage() {
  return (
    <ToastProvider>
      <TopBar />
      <ParticipantSync />
      <main className="mx-auto max-w-[920px] px-5 pb-20 pt-6">
        <ActivityHeader
          step="Activity · Phase 2 & 3"
          title="Team Wall"
          description="Every team on one page. Browse, get inspired, find someone to talk to. Tap a card to see the full pitch."
        />
        <TeamWallBody />
      </main>
    </ToastProvider>
  );
}

function TeamWallBody() {
  const teams = useAllTeams();
  const [ownId, setOwnId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Team | null>(null);

  useEffect(() => {
    setOwnId(readOwnTeam()?.id ?? null);
  }, []);

  if (teams.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-line-2 bg-surface p-10 text-center">
        <p className="text-mute">
          No teams registered yet. Be the first — head back and lock in your team.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 mt-[22px] font-mono text-[10.5px] uppercase tracking-[0.18em] text-mute">
        {teams.length} {teams.length === 1 ? 'team' : 'teams'} registered
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => {
          const isOwn = t.id === ownId;
          return (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={`group relative overflow-hidden rounded-2xl border bg-surface p-5 text-left transition-all hover:-translate-y-0.5 ${
                isOwn ? 'border-accent/60' : 'border-line hover:border-line-2'
              }`}
            >
              <div className="mb-3 h-1.5 rounded" style={{ background: t.color }} />
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-[17px] font-semibold leading-tight tracking-tight">{t.name}</h3>
                {isOwn && (
                  <span className="rounded-full bg-accent/[0.14] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-accent">
                    You
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-ink-2">{t.idea}</p>
              <div className="mt-3.5 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute">
                <span>{t.members.length} {t.members.length === 1 ? 'member' : 'members'}</span>
                <span>·</span>
                <span className="line-clamp-1 normal-case tracking-normal">{t.members.slice(0, 2).join(', ')}{t.members.length > 2 ? '…' : ''}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selected && <TeamDetail team={selected} onClose={() => setSelected(null)} isOwn={selected.id === ownId} />}
    </>
  );
}

function TeamDetail({ team, onClose, isOwn }: { team: Team; onClose: () => void; isOwn: boolean }) {
  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-bg/85 px-4 py-6 backdrop-blur-md animate-fade-in sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[520px] animate-pop-in overflow-hidden rounded-2xl border border-line-2"
        style={{
          background: `linear-gradient(155deg, ${team.color}, color-mix(in srgb, ${team.color} 50%, #0a0a0f) 75%, #0a0a0f)`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.16) 0, transparent 50%)' }}
        />
        <div className="relative p-7">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50"
            aria-label="Close"
          >
            ×
          </button>
          <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/70">
            Team{isOwn ? ' · this is you' : ''}
          </div>
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-white">
            {team.name}
          </h2>
          <div className="mt-4 text-[15px] leading-relaxed text-white/95">
            &ldquo;{team.idea}&rdquo;
          </div>
          <div className="mt-5 border-t border-white/20 pt-4">
            <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/70">
              {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
            </div>
            <div className="text-[14px] text-white/95">{team.members.join(', ')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
