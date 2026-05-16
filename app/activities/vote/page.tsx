'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { ParticipantSync } from '@/components/ParticipantSync';
import { ActivityHeader } from '@/components/ActivityHeader';
import { ToastProvider, useToast } from '@/components/Toast';
import { useAllTeams, useUpNext, useVoteTally, castAudienceVote, type AudienceVoteChoice } from '@/lib/data';
import { readJSON, writeJSON } from '@/lib/storage';
import { ReactionsBar } from '@/components/ReactionsBar';

const VOTED_KEY = 'innovatrix26.audience-voted';

export default function AudienceVotePage() {
  return (
    <ToastProvider>
      <TopBar />
      <ParticipantSync />
      <main className="mx-auto max-w-[720px] px-5 pb-20 pt-6">
        <ActivityHeader
          step="Activity · Phase 3"
          title="Audience Vote"
          description="As each team presents, drop a quick reaction. Judges score formally — your vote is the room's gut check. One vote per team per device."
        />
        <VoteBody />
      </main>
    </ToastProvider>
  );
}

function VoteBody() {
  const { push: toast } = useToast();
  const [upNext] = useUpNext();
  const teams = useAllTeams();
  const tally = useVoteTally(upNext?.teamId ?? null);

  const team = upNext ? teams.find((t) => t.id === upNext.teamId) ?? null : null;
  const totalVotes = tally.wow + tally.cool + tally.fine;

  // Track which teamIds this device has voted on
  const [votedSet, setVotedSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    setVotedSet(new Set(readJSON<string[]>(VOTED_KEY, [])));
  }, []);

  if (!team) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-line-2 bg-surface p-10 text-center">
        <div className="mb-3 text-3xl">⏳</div>
        <p className="text-ink-2 text-[15px] leading-relaxed">
          No team is currently presenting.
          <br />
          <span className="text-mute">The coordinator marks each team as &quot;Up Next&quot; before they begin.</span>
        </p>
      </div>
    );
  }

  const alreadyVoted = votedSet.has(team.id);

  const cast = (choice: AudienceVoteChoice) => {
    if (alreadyVoted) return;
    castAudienceVote(team.id, choice, tally);
    const next = new Set(votedSet);
    next.add(team.id);
    setVotedSet(next);
    writeJSON(VOTED_KEY, [...next]);
    toast('Vote in.');
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.([20, 30, 20]);
  };

  return (
    <>
      <div
        className="mt-6 overflow-hidden rounded-2xl p-6 relative"
        style={{
          background: `linear-gradient(140deg, ${team.color}, color-mix(in srgb, ${team.color} 55%, #0a0a0f))`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.16) 0, transparent 50%)' }}
        />
        <div className="relative font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/70">
          Now presenting
        </div>
        <h2 className="relative mt-1 font-display text-[26px] font-semibold leading-tight tracking-tight text-white">
          {team.name}
        </h2>
        <p className="relative mt-3 text-[14.5px] leading-relaxed text-white/95">
          &ldquo;{team.idea}&rdquo;
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <VoteButton emoji="🤩" label="Wow" tone="spark" onClick={() => cast('wow')}  disabled={alreadyVoted} />
        <VoteButton emoji="🙂" label="Cool" tone="accent" onClick={() => cast('cool')} disabled={alreadyVoted} />
        <VoteButton emoji="😐" label="Fine" tone="mute"  onClick={() => cast('fine')} disabled={alreadyVoted} />
      </div>

      {alreadyVoted && (
        <div className="mt-4 rounded-xl border border-accent/30 bg-accent/[0.06] p-4 text-center text-[13.5px] text-accent">
          ✓ Vote locked in for {team.name}. Wait for the next team.
        </div>
      )}

      {/* Live tally (everyone sees it; not gated until end-of-presentation) */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.18em] text-mute">
          <span>Room reaction</span>
          <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
        </div>
        <TallyBar label="🤩 Wow"  count={tally.wow}  total={totalVotes} colorClass="bg-spark" />
        <TallyBar label="🙂 Cool" count={tally.cool} total={totalVotes} colorClass="bg-accent" />
        <TallyBar label="😐 Fine" count={tally.fine} total={totalVotes} colorClass="bg-mute" />
      </div>

      {/* Audience reactions — taps fire emoji onto the big screen */}
      <ReactionsBar />
    </>
  );
}

function VoteButton({
  emoji, label, tone, onClick, disabled,
}: {
  emoji: string;
  label: string;
  tone: 'spark' | 'accent' | 'mute';
  onClick: () => void;
  disabled: boolean;
}) {
  const enabledBorder =
    tone === 'spark' ? 'hover:border-spark hover:bg-spark/[0.08]' :
    tone === 'accent' ? 'hover:border-accent hover:bg-accent/[0.08]' :
    'hover:border-line-2 hover:bg-surface-2';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center rounded-2xl border border-line bg-surface px-3 py-6 transition-all ${
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:-translate-y-0.5 ' + enabledBorder
      }`}
    >
      <span className="text-5xl">{emoji}</span>
      <span className="mt-2 font-display text-sm font-semibold tracking-tight">{label}</span>
    </button>
  );
}

function TallyBar({ label, count, total, colorClass }: { label: string; count: number; total: number; colorClass: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-baseline justify-between text-[13px]">
        <span className="text-ink-2">{label}</span>
        <span className="font-mono text-mute">{count} · {pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
        <div className={`h-full transition-all duration-500 ${colorClass}`} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}
