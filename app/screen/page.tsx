'use client';

import { useEffect, useMemo, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ClientOnly } from '@/components/ClientOnly';
import { pad } from '@/lib/schedule';
import {
  useGallery,
  usePublicReveal,
  topThree,
  type FinalRanking,
  type FinalResults,
  type Photo,
} from '@/lib/data';

/**
 * Projector display - rebuilt for the Prize Distribution Ceremony.
 *
 * Five stages drive the entire screen, all controlled from /console:
 *   - idle        : ambient photo-booth slideshow + ceremony pre-roll
 *   - third       : 3rd place reveal (champion-rise into rose tone)
 *   - second      : 2nd place reveal (champion-rise into violet tone)
 *   - first       : 1st place reveal with confetti rain + gold trophy
 *   - leaderboard : all 24 teams in ranked order, top-3 highlighted
 *
 * Press F to fullscreen.
 */
export default function ScreenPage() {
  return (
    <ClientOnly fallback={<ScreenShell />}>
      <ScreenLive />
    </ClientOnly>
  );
}

function ScreenShell() {
  return <div className="grid min-h-screen w-screen place-items-center bg-bg text-mute font-mono text-[12px]">···</div>;
}

function ScreenLive() {
  const [now, setNow] = useState(() => new Date());
  // Projector reads the stage-filtered publicReveal, NOT the coord-only
  // master finalResults. If you're tempted to switch this back: don't.
  // Doing so would re-expose hidden ranks to anyone watching the projector
  // before the coordinator triggered the reveal.
  const results = usePublicReveal();
  const gallery = useGallery();

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.clearInterval(id); window.removeEventListener('keydown', onKey); };
  }, []);

  const stage = results?.stage ?? 'idle';
  const podium = topThree(results);

  return (
    <div className="relative grid min-h-screen w-screen grid-rows-[auto_1fr] gap-4 overflow-hidden p-8 md:p-12">
      {/* Top bar — minimal, just the mark + clock + stage chip */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3.5 font-display text-[22px] font-semibold tracking-tight text-ink">
          <BrandMark filled size={36} />
          <span>INNOVATRIX</span>
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[13px] tracking-[0.18em] text-mute shadow-soft">
            &apos;26
          </span>
          <span className="ml-3 rounded-full border border-accent/40 bg-accent/[0.08] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.32em] text-accent">
            Prize ceremony
          </span>
        </div>
        <div className="text-right">
          <div className="font-mono text-[32px] font-semibold leading-none tracking-tight text-ink">
            {`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`}
          </div>
          <div className="mt-1 font-mono text-[12px] uppercase tracking-[0.16em] text-mute">
            18 May 2026 &middot; IST
          </div>
        </div>
      </div>

      {/* Main stage swaps per ceremony phase */}
      <div className="relative flex items-center justify-center overflow-hidden">
        {stage === 'idle'        && <IdleSlideshow photos={gallery} />}
        {stage === 'third'       && <WinnerReveal medal="bronze" entry={podium.third}  results={results} />}
        {stage === 'second'      && <WinnerReveal medal="silver" entry={podium.second} results={results} />}
        {stage === 'first'       && <WinnerReveal medal="gold"   entry={podium.first}  results={results} celebratory />}
        {stage === 'leaderboard' && <Leaderboard results={results} />}
      </div>
    </div>
  );
}

// ─── Stage · Idle (photo gallery slideshow) ─────────────────────────────────

function IdleSlideshow({ photos }: { photos: Photo[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % photos.length);
    }, 4500); // 4.5s per photo - long enough to admire, short enough to feel alive
    return () => window.clearInterval(id);
  }, [photos.length]);

  return (
    <div className="relative h-full w-full">
      {/* Background slideshow — each photo cross-fades behind a VERY heavy
          blur + dark overlay so the foreground title is what reads. The
          photos function as ambient brand-coloured wash rather than
          recognisable images. */}
      {photos.length > 0 && photos.map((p, i) => {
        const active = i === idx % photos.length;
        return (
          <div
            key={p.id}
            aria-hidden
            className={`absolute inset-0 transition-opacity duration-[1500ms] ease-out ${active ? 'opacity-100' : 'opacity-0'}`}
            style={{
              backgroundImage: `url(${p.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              // Heavier blur + much lower brightness so the photo reads
              // as ambient colour rather than a recognisable image.
              filter: 'blur(72px) saturate(1.2) brightness(0.32)',
              // Bigger scale hides the blur-induced edge fade-out.
              transform: 'scale(1.18)',
            }}
          />
        );
      })}
      {/* Two-layer dark wash on top: vertical gradient + flat veil. Pushes
          the photos firmly into the background. */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-bg/70 via-bg/80 to-bg" />
      <div aria-hidden className="absolute inset-0 bg-bg/40 backdrop-blur-md" />

      {/* Foreground copy */}
      <div className="relative flex h-full flex-col items-center justify-center text-center">
        <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-accent/30 bg-accent/[0.06] px-5 py-2 font-mono text-[clamp(11px,1.2vw,14px)] uppercase tracking-[0.32em] text-accent backdrop-blur-md">
          <span className="inline-block h-2 w-2 animate-pulse-soft rounded-full bg-accent" />
          The day&rsquo;s about to land
        </div>
        <h1 className="mb-6 font-display text-[clamp(56px,11vw,180px)] font-extrabold leading-[0.92] tracking-[-0.04em] text-ink">
          Prize Distribution
          <br />
          <span className="font-serif italic font-light text-accent">Ceremony.</span>
        </h1>
        <p className="mx-auto max-w-[1100px] text-[clamp(17px,2vw,26px)] leading-snug text-ink-2">
          Twenty-four teams. Six hours of grit. <b>The panel has spoken.</b> Settle in - we&rsquo;re about to call the top three.
        </p>
      </div>
    </div>
  );
}

// ─── Stage · Winner reveal (3rd / 2nd / 1st) ────────────────────────────────

type Medal = 'bronze' | 'silver' | 'gold';

const MEDAL_META: Record<Medal, { label: string; emoji: string; tint: string; ring: string }> = {
  bronze: { label: '3rd Place', emoji: '🥉', tint: '#F87171', ring: 'rgba(248,113,113,0.35)' },
  silver: { label: '2nd Place', emoji: '🥈', tint: '#A78BFA', ring: 'rgba(167,139,250,0.35)' },
  gold:   { label: '1st Place', emoji: '🥇', tint: '#FBBF24', ring: 'rgba(251,191,36,0.45)' },
};

function WinnerReveal({
  medal, entry, results, celebratory = false,
}: {
  medal: Medal;
  entry: FinalRanking | undefined;
  results: FinalResults | null;
  celebratory?: boolean;
}) {
  const meta = MEDAL_META[medal];

  if (!entry) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 inline-flex items-center rounded-full border border-mute/30 bg-surface px-5 py-2 font-mono text-[14px] uppercase tracking-[0.32em] text-mute">
          {meta.label}
        </div>
        <h1 className="font-display text-[clamp(40px,5vw,72px)] font-bold text-ink-2">
          Awaiting reveal…
        </h1>
        <p className="mt-4 max-w-[700px] text-[clamp(14px,1.6vw,18px)] text-mute">
          The coordinator hasn&rsquo;t entered the rankings yet, or this slot has no team assigned.
        </p>
      </div>
    );
  }

  const teamColor = entry.color ?? meta.tint;

  // A reveal-key forces the animation to replay if the same stage is
  // triggered again (e.g. coord re-clicks Reveal 1st for emphasis).
  const revealKey = results?.revealedAt?.[
    medal === 'gold' ? 'first' : medal === 'silver' ? 'second' : 'third'
  ] ?? 0;

  return (
    <div key={revealKey} className="relative flex h-full w-full max-w-[1600px] flex-col items-center justify-center text-center">
      {celebratory && <ConfettiField />}

      {/* Aura glow behind the team name — picks up the team's brand colour. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 55%, ${meta.ring} 0%, transparent 70%), radial-gradient(ellipse 80% 60% at 50% 50%, ${teamColor}22 0%, transparent 65%)`,
        }}
      />

      <div className="relative">
        <div
          className="mb-6 inline-flex items-center gap-3 rounded-full border px-5 py-2 font-mono text-[clamp(13px,1.6vw,18px)] uppercase tracking-[0.32em] backdrop-blur-md animate-medal-shimmer"
          style={{ borderColor: meta.tint + '66', background: meta.tint + '14', color: meta.tint }}
        >
          <span aria-hidden className="text-[clamp(20px,2vw,26px)]">{meta.emoji}</span>
          {meta.label}
        </div>

        <div className="mb-4 font-mono text-[clamp(12px,1.3vw,16px)] uppercase tracking-[0.36em] text-mute animate-champion-rise" style={{ animationDelay: '120ms' }}>
          Team {entry.teamNumber ? `#${String(entry.teamNumber).padStart(2, '0')}` : ''}
        </div>

        <h1
          className="font-display font-extrabold leading-[0.92] tracking-[-0.045em] animate-champion-rise"
          style={{
            color: teamColor,
            fontSize: 'clamp(72px, 14vw, 220px)',
            animationDelay: '200ms',
            textShadow: `0 0 80px ${teamColor}50`,
          }}
        >
          {entry.teamName}
        </h1>

        <div
          className="mt-8 inline-flex items-baseline gap-4 rounded-2xl border bg-surface/60 px-7 py-4 backdrop-blur-md animate-champion-rise"
          style={{ borderColor: meta.tint + '40', animationDelay: '420ms' }}
        >
          <span className="font-mono text-[clamp(11px,1.2vw,15px)] uppercase tracking-[0.32em] text-mute">
            Score
          </span>
          <span
            className="font-display text-[clamp(36px,5vw,72px)] font-bold leading-none tracking-tight"
            style={{ color: meta.tint }}
          >
            {entry.marks.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Confetti rain - 80 absolute-positioned squares with randomised
// horizontal drift, fall duration, delay and tint. Pure CSS, no library.
function ConfettiField() {
  const pieces = useMemo(() => {
    const tints = ['#FBBF24', '#22D3EE', '#A78BFA', '#F87171', '#84CC16', '#6366F1', '#F5F3EE'];
    return Array.from({ length: 80 }).map((_, i) => {
      const left = Math.random() * 100;
      const driftX = (Math.random() * 80 - 40) + 'vw';
      const duration = (2.8 + Math.random() * 3.2).toFixed(2) + 's';
      const delay = (Math.random() * 2.5).toFixed(2) + 's';
      const tint = tints[i % tints.length];
      const size = 6 + Math.floor(Math.random() * 10);
      return { left, driftX, duration, delay, tint, size, i };
    });
  }, []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.i}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.4,
            background: p.tint,
            borderRadius: 1,
            // Custom-property hooks the keyframe reads
            ['--confetti-x' as string]: p.driftX,
            ['--confetti-dur' as string]: p.duration,
            ['--confetti-delay' as string]: p.delay,
          }}
        />
      ))}
    </div>
  );
}

// ─── Stage · Full leaderboard (all 24 teams) ────────────────────────────────

function Leaderboard({ results }: { results: FinalResults | null }) {
  const rankings = results?.rankings ?? [];

  // Sort: non-DQ by rank ascending, then DQ at the bottom by team number.
  const sorted = [...rankings].sort((a, b) => {
    if (a.disqualified && !b.disqualified) return 1;
    if (!a.disqualified && b.disqualified) return -1;
    if (a.disqualified && b.disqualified) {
      return (a.teamNumber ?? 999) - (b.teamNumber ?? 999);
    }
    return a.rank - b.rank;
  });

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 inline-flex items-center rounded-full border border-mute/30 bg-surface px-5 py-2 font-mono text-[14px] uppercase tracking-[0.32em] text-mute">
          Final standings
        </div>
        <h1 className="font-display text-[clamp(40px,5vw,72px)] font-bold text-ink-2">
          Awaiting rankings…
        </h1>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center">
      <div className="mb-3 inline-flex items-center gap-3 rounded-full border border-accent/40 bg-accent/[0.08] px-5 py-2 font-mono text-[clamp(11px,1.2vw,14px)] uppercase tracking-[0.32em] text-accent">
        <span className="inline-block h-2 w-2 animate-pulse-soft rounded-full bg-accent" />
        Final standings
      </div>
      <h2 className="mb-8 font-display text-[clamp(36px,5vw,72px)] font-bold leading-tight tracking-tight text-ink">
        All <span className="font-serif italic font-light text-accent">twenty-four.</span>
      </h2>

      <div className="grid w-full max-w-[1700px] grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((r, i) => (
          <LeaderboardRow key={`${r.teamName}-${i}`} entry={r} index={i} />
        ))}
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, index }: { entry: FinalRanking; index: number }) {
  const isTopThree = !entry.disqualified && entry.rank <= 3;
  const medalEmoji = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '';
  const tint = entry.color ?? (
    entry.rank === 1 ? '#FBBF24'
    : entry.rank === 2 ? '#A78BFA'
    : entry.rank === 3 ? '#F87171'
    : 'rgba(245,243,238,0.18)'
  );
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 backdrop-blur-sm animate-leaderboard-row ${
        entry.disqualified
          ? 'border-line bg-surface/40 opacity-60'
          : isTopThree
            ? 'border-line-2 bg-surface shadow-soft'
            : 'border-line bg-surface/80'
      }`}
      style={{ animationDelay: `${Math.min(index * 25, 800)}ms` }}
    >
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-bg font-display text-[16px] font-extrabold tabular-nums text-ink">
        {entry.disqualified
          ? <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">DQ</span>
          : <>
              <span style={{ color: isTopThree ? tint : undefined }}>{entry.rank}</span>
              {medalEmoji && <span className="text-[14px] leading-none">{medalEmoji}</span>}
            </>}
      </div>
      <div className="h-12 w-1.5 shrink-0 rounded" style={{ background: tint }} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[clamp(13px,1.2vw,17px)] font-semibold leading-tight tracking-tight text-ink">
          {entry.teamName}
        </div>
        {entry.teamNumber && (
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
            Team #{String(entry.teamNumber).padStart(2, '0')}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="font-display text-[clamp(14px,1.4vw,18px)] font-bold tabular-nums text-ink">
          {entry.marks.toFixed(2)}
        </div>
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-mute">marks</div>
      </div>
    </div>
  );
}
