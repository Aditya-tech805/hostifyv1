'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { ClientOnly } from '@/components/ClientOnly';
import { ToastProvider } from '@/components/Toast';
import { readOwnTeam, type Team } from '@/lib/teams';
import {
  useFinalResults,
  useGallery,
  type CeremonyStage,
  type FinalRanking,
} from '@/lib/data';

/**
 * Participant entry point - Prize Ceremony version.
 *
 * IMPORTANT: this view *strictly* mirrors the projector's reveal stage.
 * If the coordinator hasn't clicked "Reveal 3rd" yet, no participant on
 * their phone sees any rank, score, or even hint of the result. As each
 * stage is revealed on the projector, the corresponding entries appear
 * here too.
 *
 * The data still lives in a public kv table - so a DevTools-savvy user
 * could in theory inspect it. The UI gating below covers the casual
 * case (every other participant in the room). If we need cryptographic
 * secrecy, the rankings need to move behind a coord-only API endpoint
 * with stage-gated filtering. (Not done here.)
 */
export default function ParticipantPage() {
  return (
    <ToastProvider>
      <ClientOnly fallback={<ParticipantShell />}>
        <ParticipantLive />
      </ClientOnly>
    </ToastProvider>
  );
}

function ParticipantShell() {
  return <div className="grid min-h-screen w-screen place-items-center bg-bg text-mute font-mono text-[12px]">···</div>;
}

// What ranks are visible at each stage. 'leaderboard' = all.
function visibleRanksFor(stage: CeremonyStage): 'all' | Set<number> {
  if (stage === 'idle')        return new Set();
  if (stage === 'third')       return new Set([3]);
  if (stage === 'second')      return new Set([2, 3]);
  if (stage === 'first')       return new Set([1, 2, 3]);
  if (stage === 'leaderboard') return 'all';
  return new Set();
}

function ParticipantLive() {
  const [results] = useFinalResults();
  const [own, setOwn] = useState<Team | null>(null);
  const gallery = useGallery();

  useEffect(() => {
    setOwn(readOwnTeam());
  }, []);

  const stage: CeremonyStage = results?.stage ?? 'idle';
  const visible = visibleRanksFor(stage);

  // Filter the rankings the participant is allowed to see right now.
  const revealedEntries: FinalRanking[] =
    visible === 'all'
      ? results?.rankings ?? []
      : (results?.rankings ?? []).filter((r) => visible.has(r.rank) && !r.disqualified);

  // Their own entry, only if their rank is in the visible set.
  const ownEntry: FinalRanking | undefined = (() => {
    if (!own || !results) return undefined;
    const candidate = results.rankings.find(
      (r) => r.teamId === own.id || r.teamName.toLowerCase() === own.name.toLowerCase(),
    );
    if (!candidate) return undefined;
    if (visible === 'all') return candidate;
    if (candidate.disqualified) {
      // DQ result only visible on the final leaderboard stage.
      return undefined;
    }
    return visible.has(candidate.rank) ? candidate : undefined;
  })();

  return (
    <main className="mx-auto max-w-[820px] px-5 pb-24 pt-10">
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3 font-display font-semibold tracking-tight text-ink">
          <BrandMark filled size={28} />
          <span>INNOVATRIX</span>
          <span className="rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[10px] tracking-[0.18em] text-mute">
            &apos;26
          </span>
        </div>
        <Link
          href="/screen"
          className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-mute transition-colors hover:text-ink sm:inline-block"
        >
          watch the ceremony &rarr;
        </Link>
      </header>

      <section className="mb-10 rounded-[28px] border border-line-2 bg-surface p-8 shadow-soft-lg">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-accent">
          18 May 2026 &middot; that&rsquo;s a wrap
        </div>
        <h1 className="mt-3 font-display text-[clamp(34px,5vw,52px)] font-extrabold leading-[0.98] tracking-[-0.025em] text-ink">
          Thanks for being part of <span className="font-serif italic font-light text-accent">INNOVATRIX &apos;26.</span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
          Twenty-four teams. Six hours. One panel. Every team that showed up shipped something worth being proud of.
        </p>
      </section>

      {/* Stage-aware status banner. Always present so participants know
          where in the ceremony they are without showing anything they
          haven't earned the right to see yet. */}
      <StageBanner stage={stage} />

      {/* Personal result card - only renders if the participant's rank
          falls within the currently-revealed set. */}
      {ownEntry && <YourResultCard entry={ownEntry} team={own} stage={stage} />}

      {/* Revealed entries so far - the running podium as the ceremony
          progresses. NOT shown during idle. NOT the full leaderboard
          until stage === 'leaderboard'. */}
      {stage !== 'idle' && stage !== 'leaderboard' && revealedEntries.length > 0 && (
        <RevealedSoFar entries={revealedEntries} />
      )}

      {/* Full leaderboard only at the final stage. */}
      {stage === 'leaderboard' && results && results.rankings.length > 0 && (
        <FullLeaderboard rankings={results.rankings} ownTeamId={own?.id} />
      )}

      {gallery.length > 0 && (
        <section className="mt-12">
          <div className="mb-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-mute">
            <span className="h-px w-8 bg-line-2" />
            From the day
          </div>
          <h2 className="mb-6 font-display text-[clamp(24px,3vw,36px)] font-bold leading-tight tracking-tight text-ink">
            Moments captured at the <span className="font-serif italic font-light text-accent">booth.</span>
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {gallery.slice(0, 12).map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={p.url}
                alt={`Booth photo by ${p.teamName}`}
                className="aspect-square w-full rounded-xl border border-line object-cover"
                loading="lazy"
              />
            ))}
          </div>
        </section>
      )}

      <footer className="mt-16 border-t border-line pt-6 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-mute">
        Built for INNOVATRIX &apos;26 &middot; thanks for an unreal day
      </footer>
    </main>
  );
}

// ─── Stage banner (always visible, gates nothing else away) ─────────────────

function StageBanner({ stage }: { stage: CeremonyStage }) {
  const meta = (() => {
    switch (stage) {
      case 'idle':
        return {
          title: 'Results are still under wraps.',
          body: 'The panel’s scoring is final. The reveal happens on the projector. Keep your eyes on the big screen — nothing here will spoil it.',
          tint: '#94A3B8',
          eyebrow: 'Awaiting the ceremony',
        };
      case 'third':
        return {
          title: 'Third place is revealed.',
          body: 'Look at the projector for the reveal animation. Second is coming up next.',
          tint: '#F87171',
          eyebrow: '🥉 3rd place • live now',
        };
      case 'second':
        return {
          title: 'Second place is revealed.',
          body: 'Third and second are now on the board. First place is about to be called.',
          tint: '#A78BFA',
          eyebrow: '🥈 2nd place • live now',
        };
      case 'first':
        return {
          title: 'We have a champion.',
          body: 'First place is on the projector right now. Stick around for the full standings.',
          tint: '#FBBF24',
          eyebrow: '🥇 1st place • live now',
        };
      case 'leaderboard':
        return {
          title: 'Full standings are out.',
          body: 'All twenty-four teams below. Scroll your row, take a screenshot, share the day.',
          tint: '#22D3EE',
          eyebrow: 'Final leaderboard',
        };
    }
  })();

  return (
    <section
      className="mb-8 overflow-hidden rounded-2xl border p-5"
      style={{
        background: `linear-gradient(135deg, ${meta.tint}14, transparent 70%)`,
        borderColor: meta.tint + '40',
      }}
    >
      <div className="font-mono text-[10.5px] uppercase tracking-[0.22em]" style={{ color: meta.tint }}>
        {meta.eyebrow}
      </div>
      <h2 className="mt-1.5 font-display text-[clamp(20px,3vw,26px)] font-bold tracking-tight text-ink">
        {meta.title}
      </h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{meta.body}</p>
    </section>
  );
}

// ─── Your result (only when your rank is in the revealed set) ───────────────

function YourResultCard({
  entry, team, stage,
}: {
  entry: FinalRanking;
  team: Team | null;
  stage: CeremonyStage;
}) {
  const isTopThree = !entry.disqualified && entry.rank >= 1 && entry.rank <= 3;
  const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '';
  const tint = entry.color ?? team?.color ?? '#A78BFA';

  return (
    <section
      className="mb-10 overflow-hidden rounded-[28px] border border-line-2 p-7 shadow-soft-lg"
      style={{
        background: `linear-gradient(140deg, ${tint}20, ${tint}05 60%, transparent 100%)`,
      }}
    >
      <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-mute">
        Your result &middot; just revealed
      </div>
      <div className="flex items-baseline gap-3">
        <div
          className="font-display text-[clamp(52px,8vw,84px)] font-extrabold leading-none tabular-nums"
          style={{ color: tint }}
        >
          {entry.disqualified ? 'DQ' : `#${entry.rank}`}
        </div>
        {medal && <div className="text-[clamp(32px,5vw,48px)]">{medal}</div>}
      </div>
      <div className="mt-2 font-display text-[clamp(22px,3vw,30px)] font-bold tracking-tight text-ink">
        {entry.teamName}
      </div>
      {!entry.disqualified && stage === 'leaderboard' && (
        // Marks only revealed alongside the final leaderboard so the
        // podium moments keep their drama on the projector.
        <div className="mt-3 inline-flex items-baseline gap-2 rounded-xl border border-line bg-bg/40 px-4 py-2 backdrop-blur-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-mute">Marks</span>
          <span className="font-display text-[20px] font-bold tabular-nums text-ink">{entry.marks.toFixed(2)}</span>
        </div>
      )}
      {isTopThree && (
        <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
          <b>Congratulations.</b> You&rsquo;re on the podium &mdash; the projector is showing the reveal animation right now.
        </p>
      )}
    </section>
  );
}

// ─── Revealed-so-far list (top 1-3 progressively, never spoils) ─────────────

function RevealedSoFar({ entries }: { entries: FinalRanking[] }) {
  // Display in reverse rank order so the most recent reveal is on top
  // (3 first if only 3, then 2 above when 2 reveals, then 1 above 2 above 3).
  const ordered = [...entries].sort((a, b) => a.rank - b.rank);
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-mute">
        <span className="h-px w-8 bg-line-2" />
        Revealed so far
      </div>
      <div className="space-y-2">
        {ordered.map((r) => {
          const tint = r.color ?? (r.rank === 1 ? '#FBBF24' : r.rank === 2 ? '#A78BFA' : '#F87171');
          const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉';
          return (
            <div
              key={`${r.teamName}-${r.rank}`}
              className="flex items-center gap-3 rounded-xl border border-line-2 bg-surface px-4 py-3 shadow-soft"
              style={{ borderColor: tint + '60' }}
            >
              <div className="text-[clamp(28px,5vw,36px)]">{medal}</div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: tint }}>
                  Rank #{r.rank}
                </div>
                <div className="truncate font-display text-[clamp(17px,2vw,22px)] font-bold tracking-tight text-ink">
                  {r.teamName}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Full leaderboard (stage='leaderboard' only) ────────────────────────────

function FullLeaderboard({ rankings, ownTeamId }: { rankings: FinalRanking[]; ownTeamId?: string }) {
  const sorted = [...rankings].sort((a, b) => {
    if (a.disqualified && !b.disqualified) return 1;
    if (!a.disqualified && b.disqualified) return -1;
    if (a.disqualified && b.disqualified) return (a.teamNumber ?? 999) - (b.teamNumber ?? 999);
    return a.rank - b.rank;
  });
  return (
    <section className="mt-4">
      <div className="mb-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-mute">
        <span className="h-px w-8 bg-line-2" />
        Final standings
      </div>
      <h2 className="mb-6 font-display text-[clamp(24px,3vw,36px)] font-bold leading-tight tracking-tight text-ink">
        All <span className="font-serif italic font-light text-accent">twenty-four.</span>
      </h2>
      <div className="space-y-1.5">
        {sorted.map((r, i) => {
          const isMine = ownTeamId && r.teamId === ownTeamId;
          const tint = r.color ?? (r.rank === 1 ? '#FBBF24' : r.rank === 2 ? '#A78BFA' : r.rank === 3 ? '#F87171' : 'rgba(245,243,238,0.18)');
          return (
            <div
              key={`${r.teamName}-${i}`}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                r.disqualified
                  ? 'border-line bg-surface/40 opacity-60'
                  : isMine
                    ? 'border-accent/60 bg-accent/[0.06]'
                    : 'border-line bg-surface'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg font-display text-[14px] font-extrabold tabular-nums">
                {r.disqualified ? <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-mute">DQ</span> : <span style={{ color: r.rank <= 3 ? tint : undefined }}>{r.rank}</span>}
              </div>
              <div className="h-10 w-1 shrink-0 rounded" style={{ background: tint }} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[14px] font-semibold leading-tight tracking-tight text-ink">
                  {r.teamName} {isMine && <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">(you)</span>}
                </div>
                {r.teamNumber && (
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-mute">
                    Team #{String(r.teamNumber).padStart(2, '0')}
                  </div>
                )}
              </div>
              <div className="shrink-0 font-display text-[14px] font-bold tabular-nums text-ink">
                {r.marks.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
