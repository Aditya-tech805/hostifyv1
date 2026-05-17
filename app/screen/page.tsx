'use client';

import { useEffect, useMemo, useState } from 'react';
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
import {
  useAllTeams, useUpNext, useVoteTally,
  usePanel, useMessage, type PanelMember, type ScreenMessage,
} from '@/lib/data';

/**
 * Projector display.
 *
 * The centre region is a slow carousel that rotates editorial slides:
 *   1. Phase status (current phase + countdown)
 *   2. About INNOVATRIX '26
 *   3. The judges panel (live from /console)
 *   4. Message · from the faculty
 *   5. Message · from the HOD
 *   6. Message · from the student coordinator
 *
 * Slides with no data (e.g. an unset message slot) are dropped from the
 * rotation. When a team is "Up next" (Phase 3 active presenter), the
 * carousel pauses and the team takes over the stage — the moment matters
 * more than the editorial reel.
 *
 * Press F to fullscreen. Wrapped in <ClientOnly> because everything depends
 * on the live clock.
 */
export default function ScreenPage() {
  return (
    <ClientOnly fallback={<ScreenShell />}>
      <ScreenLive />
    </ClientOnly>
  );
}

function ScreenShell() {
  return (
    <div className="grid min-h-screen w-screen grid-rows-[auto_1fr_auto] gap-6 p-8 md:p-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5 font-display text-[22px] font-semibold tracking-tight text-ink">
          <BrandMark filled size={36} />
          <span>INNOVATRIX</span>
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[13px] tracking-[0.18em] text-mute shadow-soft">&apos;26</span>
        </div>
      </div>
      <div className="flex items-center justify-center text-center text-mute">···</div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface px-6 py-5 shadow-soft" />
        <div className="rounded-2xl border border-line bg-surface px-6 py-5 shadow-soft" />
        <div className="rounded-2xl border border-line bg-surface px-6 py-5 shadow-soft" />
        <div className="rounded-2xl border border-line bg-surface px-6 py-5 shadow-soft" />
      </div>
    </div>
  );
}

// ─── Carousel timing ─────────────────────────────────────────────────────────
const SLIDE_MS = 12_000; // 12 seconds per slide — readable from the back row.

type SlideId = 'phase' | 'about' | 'panel' | 'faculty' | 'hod' | 'studentCoord';

function ScreenLive() {
  const { now, state } = useEventPhase();
  const teams = useAllTeams();
  const teamCount = teams.length;
  const [host, setHost] = useState('innovatrix26.app');
  const [upNext] = useUpNext();
  const upNextTeam = upNext ? teams.find((t) => t.id === upNext.teamId) ?? null : null;
  const upNextTally = useVoteTally(upNext?.teamId ?? null);

  // Carousel data sources
  const panel = usePanel();
  const facultyMsg = useMessage('faculty');
  const hodMsg = useMessage('hod');
  const coordMsg = useMessage('studentCoord');

  // Decide which slides are actually shown — drop empty ones.
  const slides: SlideId[] = useMemo(() => {
    const list: SlideId[] = ['phase', 'about'];
    if (panel.length > 0) list.push('panel');
    if (facultyMsg.body.trim().length > 0) list.push('faculty');
    if (hodMsg.body.trim().length > 0) list.push('hod');
    if (coordMsg.body.trim().length > 0) list.push('studentCoord');
    return list;
  }, [panel.length, facultyMsg.body, hodMsg.body, coordMsg.body]);

  // Carousel index — advances on a timer; resets if the slide list shrinks.
  const [slideIdx, setSlideIdx] = useState(0);
  useEffect(() => {
    if (slides.length === 0) return;
    setSlideIdx((i) => (i >= slides.length ? 0 : i));
  }, [slides.length]);

  // Pause the carousel when a team is presenting — the team takeover owns
  // the screen during that window.
  const presenterMode = !!upNextTeam;

  useEffect(() => {
    if (presenterMode || slides.length <= 1) return;
    const id = window.setInterval(() => {
      setSlideIdx((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [presenterMode, slides.length]);

  useEffect(() => {
    setHost(window.location.host || 'innovatrix26.app');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
      // Manual carousel control — useful during rehearsal.
      if (e.key === 'ArrowRight') setSlideIdx((i) => (i + 1) % Math.max(slides.length, 1));
      if (e.key === 'ArrowLeft')  setSlideIdx((i) => (i - 1 + Math.max(slides.length, 1)) % Math.max(slides.length, 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slides.length]);

  const currentSlide = slides[slideIdx] ?? 'phase';

  return (
    <div className="grid min-h-screen w-screen cursor-none grid-rows-[auto_1fr_auto] gap-6 overflow-hidden p-8 md:p-12 [body:has(&)]:cursor-none">
      <div className="absolute right-3 top-2 font-mono text-[10px] uppercase tracking-[0.12em] text-mute opacity-50">
        PRESS F · FULLSCREEN · ←/→ TO STEP
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5 font-display text-[22px] font-semibold tracking-tight text-ink">
          <BrandMark filled size={36} />
          <span>INNOVATRIX</span>
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[13px] tracking-[0.18em] text-mute shadow-soft">
            &apos;26
          </span>
        </div>
        <div className="text-right">
          <div className="font-mono text-[36px] font-semibold leading-none tracking-tight text-ink">
            {`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`}
          </div>
          <div className="mt-1.5 font-mono text-[13px] uppercase tracking-[0.16em] text-mute">
            {now.toLocaleDateString('en', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Centre stage — either the active presenter takeover, or the carousel */}
      <div className="relative flex items-center justify-center overflow-hidden">
        {presenterMode && upNextTeam ? (
          <PresenterStage team={upNextTeam} tally={upNextTally} endsInMs={(state.phase?.end ?? now.getTime()) - now.getTime()} />
        ) : (
          <CarouselStage
            current={currentSlide}
            now={now}
            state={state}
            panel={panel}
            facultyMsg={facultyMsg}
            hodMsg={hodMsg}
            coordMsg={coordMsg}
          />
        )}

        {/* Slide pip indicator (only when carousel is active and >1 slide) */}
        {!presenterMode && slides.length > 1 && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((s, i) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === slideIdx ? 'w-8 bg-primary' : 'w-1.5 bg-line-2'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom strip — KPIs (persistent across all slides) */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Teams registered" figure={String(teamCount)} sub="OF 24 EXPECTED" figureClass="text-accent" />
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

// ─── Carousel stage (rotates between slides) ─────────────────────────────────

function CarouselStage({
  current, now, state, panel, facultyMsg, hodMsg, coordMsg,
}: {
  current: SlideId;
  now: Date;
  state: ReturnType<typeof useEventPhase>['state'];
  panel: PanelMember[];
  facultyMsg: ScreenMessage;
  hodMsg: ScreenMessage;
  coordMsg: ScreenMessage;
}) {
  // Re-key the wrapper on each slide so the fade-in animation re-fires.
  return (
    <div key={current} className="flex w-full max-w-[1500px] flex-col items-center justify-center text-center animate-slide-in">
      {current === 'phase'        && <PhaseSlide now={now} state={state} />}
      {current === 'about'        && <AboutSlide />}
      {current === 'panel'        && <PanelSlide members={panel} />}
      {current === 'faculty'      && <MessageSlide kicker="From the faculty" msg={facultyMsg} accent="primary" />}
      {current === 'hod'          && <MessageSlide kicker="From the HOD"     msg={hodMsg}     accent="accent" />}
      {current === 'studentCoord' && <MessageSlide kicker="From your student coordinator" msg={coordMsg} accent="spark" />}
    </div>
  );
}

// ─── Slide · Phase status (the original behaviour) ───────────────────────────

function PhaseSlide({ now, state }: { now: Date; state: ReturnType<typeof useEventPhase>['state'] }) {
  if (state.status === 'pre' && state.next) {
    const ms = state.next.start - now.getTime();
    return (
      <>
        <Eyebrow tone="primary">Coming up</Eyebrow>
        <Title>INNOVATRI<XLetter /></Title>
        <Subtitle>
          Twenty-four teams. Six hours. <b>Innovation, creativity, and the future you can build.</b>
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
}

// ─── Slide · About the event ─────────────────────────────────────────────────

function AboutSlide() {
  return (
    <>
      <Eyebrow tone="accent">About</Eyebrow>
      <h1 className="mb-8 font-display text-[clamp(48px,9vw,140px)] font-extrabold leading-[0.92] tracking-[-0.04em] text-ink">
        Twenty-four teams.
        <br />
        <span className="font-serif italic font-light text-accent">One day to ship.</span>
      </h1>
      <p className="mx-auto max-w-[1100px] text-[clamp(18px,2.2vw,28px)] leading-snug text-ink-2">
        INNOVATRIX is the department&apos;s one-day live innovation showcase. From <b>10 AM to 4 PM</b>, twenty-four teams move through three phases —
        <b className="text-primary"> Opening</b> · <b className="text-accent">Build</b> · <b className="text-spark">Presentations</b> —
        and end the day with a panel decision on five honest criteria.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 font-mono text-[clamp(12px,1.4vw,18px)] uppercase tracking-[0.28em] text-mute">
        <AboutTick label="24" sub="teams" />
        <AboutTick label="6" sub="hours" />
        <AboutTick label="5" sub="criteria" />
        <AboutTick label="1" sub="day · 18 May" />
      </div>
    </>
  );
}

function AboutTick({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-display text-[clamp(34px,4.5vw,64px)] font-bold text-ink">{label}</span>
      <span className="text-mute">{sub}</span>
    </div>
  );
}

// ─── Slide · The panel ──────────────────────────────────────────────────────

function PanelSlide({ members }: { members: PanelMember[] }) {
  // Big-screen tuning: 5–6 cards fit nicely in a row. Wrap on >6.
  return (
    <>
      <Eyebrow tone="primary">The panel</Eyebrow>
      <h1 className="mb-3 font-display text-[clamp(44px,8vw,120px)] font-bold leading-[0.95] tracking-[-0.035em] text-ink">
        Who&apos;s <span className="font-serif italic font-light text-accent">keeping score.</span>
      </h1>
      <p className="mx-auto mb-12 max-w-[900px] text-[clamp(16px,1.8vw,22px)] leading-snug text-ink-2">
        Five criteria — innovation, feasibility, presentation, impact, future potential — scored 0&ndash;10 per team.
      </p>
      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:gap-6">
        {members.map((m) => (
          <JudgeBigCard key={m.id} member={m} />
        ))}
      </div>
    </>
  );
}

function JudgeBigCard({ member }: { member: PanelMember }) {
  return (
    <div className="rounded-2xl border border-line-2 bg-surface p-5 shadow-soft md:p-6">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-full font-display text-[20px] font-bold tracking-tight text-bg md:h-20 md:w-20 md:text-[24px]"
        style={{ background: member.color }}
      >
        {initialsOf(member.name)}
      </div>
      <div className="font-display text-[clamp(15px,1.4vw,20px)] font-semibold leading-tight tracking-tight text-ink">
        {member.name}
      </div>
      <div className="mt-2 font-mono text-[clamp(10px,0.9vw,13px)] uppercase tracking-[0.18em] text-mute">
        {member.role}
      </div>
    </div>
  );
}

function initialsOf(name: string): string {
  const cleaned = name.replace(/[\[\]().]/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Slide · Message (faculty / HOD / student coordinator) ──────────────────

function MessageSlide({
  kicker, msg, accent,
}: { kicker: string; msg: ScreenMessage; accent: 'primary' | 'accent' | 'spark' }) {
  const accentText =
    accent === 'spark' ? 'text-spark' : accent === 'accent' ? 'text-accent' : 'text-primary';
  return (
    <>
      <Eyebrow tone={accent}>{kicker}</Eyebrow>
      <div className="mx-auto max-w-[1280px]">
        <div className={`mb-5 text-left font-serif text-[clamp(72px,12vw,180px)] leading-[0.6] ${accentText} opacity-30`} aria-hidden>
          &ldquo;
        </div>
        <blockquote className="text-left font-display text-[clamp(28px,3.6vw,52px)] font-medium leading-[1.18] tracking-[-0.015em] text-ink">
          {msg.body}
        </blockquote>
        <div className="mt-12 flex items-center gap-5 text-left">
          <span className={`h-px w-16 ${
            accent === 'spark' ? 'bg-spark/60' : accent === 'accent' ? 'bg-accent/60' : 'bg-primary/60'
          }`} />
          <div>
            <div className="font-display text-[clamp(18px,1.8vw,26px)] font-semibold tracking-tight text-ink">
              {msg.from}
            </div>
            <div className="mt-1 font-mono text-[clamp(11px,1vw,14px)] uppercase tracking-[0.24em] text-mute">
              {msg.role || ' '}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Presenter takeover (Phase 3 active team) ───────────────────────────────

function PresenterStage({
  team, tally, endsInMs,
}: {
  team: { id: string; name: string; color: string; idea: string };
  tally: { wow: number; cool: number; fine: number };
  endsInMs: number;
}) {
  const totalVotes = tally.wow + tally.cool + tally.fine;
  return (
    <div className="flex w-full max-w-[1400px] flex-col items-center justify-center text-center animate-slide-in">
      <Eyebrow tone="primary">Now presenting</Eyebrow>
      <div className="mb-2 font-mono text-[clamp(13px,1.4vw,18px)] uppercase tracking-[0.32em] text-mute">
        Team
      </div>
      <h1
        className="mb-6 font-display text-[clamp(56px,11vw,160px)] font-bold leading-[0.95] tracking-[-0.04em]"
        style={{ color: team.color }}
      >
        {team.name}
      </h1>
      <Subtitle>&ldquo;{team.idea}&rdquo;</Subtitle>
      {totalVotes > 0 && (
        <div className="mt-8 inline-flex items-center gap-5 rounded-2xl border border-line bg-surface px-6 py-3 font-mono text-[clamp(14px,1.6vw,22px)]">
          <span><span className="text-spark">🤩</span> {tally.wow}</span>
          <span className="text-mute">·</span>
          <span><span className="text-accent">🙂</span> {tally.cool}</span>
          <span className="text-mute">·</span>
          <span><span className="text-mute">😐</span> {tally.fine}</span>
        </div>
      )}
      <Countdown label="Phase 3 ends in">{formatHHMMSS(endsInMs)}</Countdown>
    </div>
  );
}

// ─── Shared building blocks ─────────────────────────────────────────────────

function Eyebrow({ tone, children }: { tone: 'primary' | 'accent' | 'spark'; children: React.ReactNode }) {
  const cls =
    tone === 'spark'
      ? 'border-spark/40 bg-spark/[0.10] text-spark'
      : tone === 'accent'
        ? 'border-accent/35 bg-accent/[0.10] text-accent'
        : 'border-primary/30 bg-primary/[0.08] text-primary';
  return (
    <div className={`mb-6 inline-flex items-center rounded-full border px-5 py-2 font-mono text-[18px] uppercase tracking-[0.32em] backdrop-blur-md ${cls}`}>
      <span className="mr-3 inline-block h-2 w-2 animate-pulse-soft rounded-full bg-current align-middle" />
      {children}
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mb-8 font-display text-[clamp(64px,12vw,200px)] font-extrabold leading-[0.92] tracking-[-0.04em] text-ink">
      {children}
    </h1>
  );
}

function XLetter() {
  return (
    <span className="inline-block animate-x-cycle bg-gradient-brand bg-clip-text text-transparent" style={{ transformOrigin: '50% 55%' }}>
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
      <span className="bg-gradient-to-r from-primary to-accent bg-clip-text font-mono text-[clamp(40px,7vw,96px)] font-bold tracking-tight text-transparent">
        {children}
      </span>
    </div>
  );
}

function Kpi({ label, figure, sub, figureClass = '' }: { label: string; figure: string; sub?: string; figureClass?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-6 py-5 shadow-soft">
      <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-mute">{label}</div>
      <div className={`font-display text-[clamp(28px,3vw,44px)] font-extrabold leading-none tracking-tight text-ink ${figureClass}`}>
        {figure}
      </div>
      {sub && <div className="mt-1.5 font-mono text-[11px] tracking-[0.08em] text-mute">{sub}</div>}
    </div>
  );
}
