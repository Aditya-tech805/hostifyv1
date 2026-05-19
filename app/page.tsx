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
  type FinalRanking,
} from '@/lib/data';

/**
 * Participant entry point - post-event Prize Ceremony version.
 *
 * Replaces the original register-and-play landing with a thank-you panel
 * that mirrors the ceremony state on the projector:
 *   - while the ceremony hasn't revealed anything yet: thanks + gallery
 *   - once the team's rank is revealed: a personalised "you finished N"
 *     card with marks + position in the leaderboard
 *   - once the full leaderboard is on screen: a scrollable mirror of it
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

function ParticipantLive() {
  const [results] = useFinalResults();
  const [own, setOwn] = useState<Team | null>(null);
  const gallery = useGallery();

  useEffect(() => {
    setOwn(readOwnTeam());
  }, []);

  const ownEntry: FinalRanking | undefined =
    own && results
      ? results.rankings.find((r) => (r.teamId === own.id) || r.teamName.toLowerCase() === own.name.toLowerCase())
      : undefined;

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
          The big screen has the full results - we&rsquo;re running through the top three live, then the full standings.
        </p>
      </section>

      {ownEntry && <YourResultCard entry={ownEntry} team={own} />}

      {!ownEntry && own && (
        <section className="mb-10 rounded-2xl border border-dashed border-line-2 bg-surface p-6 text-center">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-mute">Your team</div>
          <div className="font-display text-[20px] font-bold tracking-tight text-ink">{own.name}</div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">
            Result not posted yet. Watch the projector or check back in a moment.
          </p>
        </section>
      )}

      {results && results.rankings.length > 0 && (
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

function YourResultCard({ entry, team }: { entry: FinalRanking; team: Team | null }) {
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
        Your result
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
      {!entry.disqualified && (
        <div className="mt-3 inline-flex items-baseline gap-2 rounded-xl border border-line bg-bg/40 px-4 py-2 backdrop-blur-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-mute">Marks</span>
          <span className="font-display text-[20px] font-bold tabular-nums text-ink">{entry.marks.toFixed(2)}</span>
        </div>
      )}
      {isTopThree && (
        <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
          <b>Congratulations.</b> You&rsquo;re on the podium. The projector reveal happens at the ceremony - keep your eyes on the big screen.
        </p>
      )}
      {entry.disqualified && (
        <p className="mt-4 text-[13.5px] leading-relaxed text-mute">
          Marked DQ by the panel. If this is unexpected, find the coordinator after the ceremony.
        </p>
      )}
    </section>
  );
}

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
