'use client';

import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ClientOnly } from '@/components/ClientOnly';
import { SpotlightOverlay } from '@/components/SpotlightOverlay';
import { ResultsOverlay } from '@/components/ResultsOverlay';
import { PresentationTimerOverlay } from '@/components/PresentationTimerOverlay';
import { ReactionsLayer } from '@/components/ReactionsLayer';
import { SprintOverlay } from '@/components/SprintOverlay';
import { PollOverlay } from '@/components/PollOverlay';
import { useEventPhase } from '@/lib/hooks';
import { formatCountdown, formatHHMMSS, pad } from '@/lib/schedule';
import { useAllTeams, useUpNext, useVoteTally } from '@/lib/data';

/**
 * Projector display. Full-viewport, dark, cursor hidden. Press F to fullscreen.
 * Wrapped in <ClientOnly> because every visible element depends on the live
 * clock — no point trying to SSR it.
 */
export default function ScreenPage() {
  return (
    <ClientOnly fallback={<ScreenShell />}>
      <ScreenLive />
    </ClientOnly>
  );
}

function ScreenShell() {
  // Minimal static skeleton for SSR / pre-mount. The live version replaces this.
  return (
    <div className="grid min-h-screen w-screen grid-rows-[auto_1fr_auto] gap-6 p-8 md:p-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5 font-display text-[22px] font-semibold tracking-tight">
          <BrandMark size={36} />
          <span>INNOVATRIX</span>
          <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[13px] tracking-[0.18em] text-mute">&apos;26</span>
        </div>
      </div>
      <div className="flex items-center justify-center text-center text-mute">···</div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-[18px] border border-line bg-surface px-6 py-5" />
        <div className="rounded-[18px] border border-line bg-surface px-6 py-5" />
        <div className="rounded-[18px] border border-line bg-surface px-6 py-5" />
        <div className="rounded-[18px] border border-line bg-surface px-6 py-5" />
      </div>
    </div>
  );
}

function ScreenLive() {
  const { now, state } = useEventPhase();
  const teams = useAllTeams();
  const teamCount = teams.length;
  const [host, setHost] = useState('innovatrix26.app');
  const [upNext] = useUpNext();
  const upNextTeam = upNext ? teams.find((t) => t.id === upNext.teamId) ?? null : null;
  const upNextTally = useVoteTally(upNext?.teamId ?? null);

  useEffect(() => {
    setHost(window.location.host || 'innovatrix26.app');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Stage content per status
  const stage = (() => {
    if (state.status === 'pre' && state.next) {
      const ms = state.next.start - now.getTime();
      return (
        <>
          <Eyebrow tone="primary">Coming up</Eyebrow>
          <Title>INNOVATRI<XLetter /></Title>
          <Subtitle>
            Sixteen teams. Six hours. <b>Innovation, creativity, and the future you can build.</b>
          </Subtitle>
          <Countdown label="Starts in">{formatCountdown(ms)}</Countdown>
        </>
      );
    }
    if ((state.status === 'live' || state.status === 'override') && state.phase) {
      const ms = state.phase.end - now.getTime();
      const tone = state.status === 'override' ? 'spark' : 'primary';
      const prefix = state.status === 'override' ? 'Override · ' : '';

      if (state.phase.id === 'phase1') {
        return (
          <>
            <Eyebrow tone={tone}>{prefix}{state.phase.label}</Eyebrow>
            <Title>Welcome.</Title>
            <Subtitle>Settle in. Register your team. Phase 2 opens at <b>10:45</b>.</Subtitle>
            <Countdown label="Phase 2 in">{formatHHMMSS(ms)}</Countdown>
          </>
        );
      }
      if (state.phase.id === 'phase2') {
        return (
          <>
            <Eyebrow tone={tone}>{prefix}{state.phase.label}</Eyebrow>
            <Title>Build.</Title>
            <Subtitle>
              Idea Cards. Networking Bingo. Pitch Lab. Get off your chair. Talk to people. <b>Spotlight at 1:00 PM.</b>
            </Subtitle>
            <Countdown label="Lunch in">{formatHHMMSS(ms)}</Countdown>
          </>
        );
      }
      if (state.phase.id === 'lunch') {
        return (
          <>
            <Eyebrow tone={tone}>Break · Lunch</Eyebrow>
            <Title>Recharge.</Title>
            <Subtitle>Presentations begin at <b>2:00 PM</b>. Last call on Pitch Lab.</Subtitle>
            <Countdown label="Phase 3 in">{formatHHMMSS(ms)}</Countdown>
          </>
        );
      }
      if (state.phase.id === 'phase3') {
        if (upNextTeam) {
          const totalVotes = upNextTally.wow + upNextTally.cool + upNextTally.fine;
          return (
            <>
              <Eyebrow tone={tone}>Now presenting</Eyebrow>
              <div className="mb-2 font-mono text-[clamp(13px,1.4vw,18px)] uppercase tracking-[0.32em] text-mute">
                Team
              </div>
              <h1
                className="mb-6 font-display text-[clamp(56px,11vw,160px)] font-bold leading-[0.95] tracking-[-0.04em]"
                style={{ color: upNextTeam.color }}
              >
                {upNextTeam.name}
              </h1>
              <Subtitle>&ldquo;{upNextTeam.idea}&rdquo;</Subtitle>
              {totalVotes > 0 && (
                <div className="mt-8 inline-flex items-center gap-5 rounded-2xl border border-line bg-surface px-6 py-3 font-mono text-[clamp(14px,1.6vw,22px)]">
                  <span><span className="text-spark">🤩</span> {upNextTally.wow}</span>
                  <span className="text-mute">·</span>
                  <span><span className="text-accent">🙂</span> {upNextTally.cool}</span>
                  <span className="text-mute">·</span>
                  <span><span className="text-mute">😐</span> {upNextTally.fine}</span>
                </div>
              )}
              <Countdown label="Phase 3 ends in">{formatHHMMSS(ms)}</Countdown>
            </>
          );
        }
        return (
          <>
            <Eyebrow tone={tone}>{prefix}{state.phase.label}</Eyebrow>
            <Title>Up next…</Title>
            <Subtitle>
              Each team: <b>5 minutes pitch · 2 minutes Q&amp;A</b>. Judges scoring in real time. (Coordinator will set the active team.)
            </Subtitle>
            <Countdown label="Wrap in">{formatHHMMSS(ms)}</Countdown>
          </>
        );
      }
      // wrap
      return (
        <>
          <Eyebrow tone="spark">Wrap · Results</Eyebrow>
          <Title>Thank you.</Title>
          <Subtitle>Tallying scores. <b>Winners reveal coming up.</b></Subtitle>
        </>
      );
    }
    // post
    return (
      <>
        <Eyebrow tone="spark">Complete</Eyebrow>
        <Title>Thank you.</Title>
        <Subtitle>INNOVATRIX 26 has concluded. <b>Until the next one.</b></Subtitle>
      </>
    );
  })();

  return (
    <div className="grid min-h-screen w-screen cursor-none grid-rows-[auto_1fr_auto] gap-6 overflow-hidden p-8 md:p-12 [body:has(&)]:cursor-none">
      <div className="absolute right-3 top-2 font-mono text-[10px] uppercase tracking-[0.12em] text-mute opacity-50">
        PRESS F · FULLSCREEN
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5 font-display text-[22px] font-semibold tracking-tight">
          <BrandMark size={36} />
          <span>INNOVATRIX</span>
          <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[13px] tracking-[0.18em] text-mute">
            &apos;26
          </span>
        </div>
        <div className="text-right">
          <div className="font-mono text-[36px] font-medium leading-none tracking-tight">
            {`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`}
          </div>
          <div className="mt-1.5 font-mono text-[13px] uppercase tracking-[0.16em] text-mute">
            {now.toLocaleDateString('en', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Centre stage */}
      <div className="flex flex-col items-center justify-center text-center">{stage}</div>

      {/* Bottom strip — KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Teams registered" figure={String(teamCount)} sub="OF 16 EXPECTED" figureClass="text-accent" />
        <Kpi
          label="Current phase"
          figure={state.status === 'pre' ? 'PRE' : state.status === 'post' ? 'DONE' : state.phase?.label.toUpperCase() ?? '—'}
          sub={
            state.status === 'pre' && state.next
              ? 'STARTS ' + formatCountdown(state.next.start - now.getTime())
              : (state.status === 'live' || state.status === 'override') && state.phase
                ? 'ENDS ' + formatCountdown(state.phase.end - now.getTime())
                : 'EVENT COMPLETE'
          }
        />
        <Kpi label="Event window" figure="10:00 → 16:00" sub="18 MAY · IST" figureClass="text-[clamp(22px,2.2vw,30px)]" />
        <Kpi label="Open the experience" figure={host} sub="SCAN THE QR ON YOUR PASS" figureClass="font-mono text-[clamp(16px,1.6vw,22px)]" />
      </div>

      {/* Synced moments — overlay everything when triggered from coordinator */}
      <SpotlightOverlay />
      <ResultsOverlay />
      <SprintOverlay />
      <PollOverlay />
      <PresentationTimerOverlay />
      <ReactionsLayer />
    </div>
  );
}

function Eyebrow({ tone, children }: { tone: 'primary' | 'accent' | 'spark'; children: React.ReactNode }) {
  const cls =
    tone === 'spark'
      ? 'border-spark/40 bg-spark/[0.08] text-spark'
      : tone === 'accent'
        ? 'border-accent/35 bg-accent/[0.06] text-accent'
        : 'border-primary/40 bg-primary/[0.10] text-primary-2';
  return (
    <div className={`mb-6 inline-flex items-center rounded-full border px-5 py-2 font-mono text-[18px] uppercase tracking-[0.32em] ${cls}`}>
      <span className="mr-3 inline-block h-2 w-2 animate-pulse-soft rounded-full bg-current align-middle" />
      {children}
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mb-8 bg-gradient-to-b from-ink to-ink/55 bg-clip-text text-[clamp(64px,12vw,200px)] font-bold leading-[0.95] tracking-[-0.04em] text-transparent">
      {children}
    </h1>
  );
}

function XLetter() {
  return (
    <span className="inline-block animate-x-cycle text-primary [-webkit-text-fill-color:#7c3aed]" style={{ transformOrigin: '50% 55%' }}>
      X
    </span>
  );
}

function Subtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-[1100px] text-[clamp(18px,2.2vw,28px)] font-normal leading-snug text-ink-2">
      {children}
    </p>
  );
}

function Countdown({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 leading-none">
      <span className="mb-4 block font-mono text-[clamp(12px,1.4vw,18px)] font-normal uppercase tracking-[0.32em] text-mute">
        {label}
      </span>
      <span className="font-mono text-[clamp(40px,7vw,96px)] font-medium tracking-tight text-accent">
        {children}
      </span>
    </div>
  );
}

function Kpi({ label, figure, sub, figureClass = '' }: { label: string; figure: string; sub?: string; figureClass?: string }) {
  return (
    <div className="rounded-[18px] border border-line bg-surface px-6 py-5">
      <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-mute">{label}</div>
      <div className={`font-display text-[clamp(28px,3vw,44px)] font-semibold leading-none tracking-tight ${figureClass}`}>
        {figure}
      </div>
      {sub && <div className="mt-1.5 font-mono text-[11px] tracking-[0.08em] text-mute">{sub}</div>}
    </div>
  );
}
