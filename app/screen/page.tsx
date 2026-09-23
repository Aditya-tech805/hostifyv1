'use client';

import { useEffect, useMemo, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ClientOnly } from '@/components/ClientOnly';
import { QrTile } from '@/components/QrTile';
import { SpotlightOverlay } from '@/components/SpotlightOverlay';
import { ResultsOverlay } from '@/components/ResultsOverlay';
import { PresentationTimerOverlay } from '@/components/PresentationTimerOverlay';
import { ReactionsLayer } from '@/components/ReactionsLayer';
import { SprintOverlay } from '@/components/SprintOverlay';
import { PollOverlay } from '@/components/PollOverlay';
import { AwardsStage } from '@/components/awards/AwardsStage';
import { useEventPhase } from '@/lib/hooks';
import { formatCountdown, formatHHMMSS, pad, type PhaseId } from '@/lib/schedule';
import { JUDGING_CRITERIA } from '@/lib/activities';
import {
  EVENT, EVENT_DATE_LONG, EVENT_DATE_SHORT, DOORS_TIME, WRAP_TIME,
  capitalize, eventTime, numberWord, to12h,
} from '@/config/event';
import {
  useAllTeams, useUpNext, useVoteTally,
  usePanel, useMessage, usePublicReveal, type PanelMember, type ScreenMessage,
} from '@/lib/data';

/**
 * Projector display.
 *
 * The centre region is a slow carousel that rotates editorial slides:
 *   1. Phase status (current phase + countdown)
 *   2. About the event (from config/event.ts)
 *   3. The judges panel (live from /console)
 *   4-6. Three coordinator-written message slots (labels in config/event.ts)
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
          <span>{EVENT.wordmark}</span>
          {EVENT.edition && (
            <span className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[13px] tracking-[0.18em] text-mute shadow-soft">
              {EVENT.edition}
            </span>
          )}
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
  // null until window.location.host is read in the effect below. We gate
  // all QR-rendering UI on `host !== null` so the QR never briefly encodes
  // a wrong fallback domain in the first paint frame.
  const [host, setHost] = useState<string | null>(null);
  const [upNext] = useUpNext();
  const upNextTeam = upNext ? teams.find((t) => t.id === upNext.teamId) ?? null : null;
  const upNextTally = useVoteTally(upNext?.teamId ?? null);
  // Awards ceremony takes over the whole stage once the coordinator moves
  // past `idle`. publicReveal is the stage-filtered copy — never the master.
  const reveal = usePublicReveal();
  const awardsMode = !!reveal && reveal.stage !== 'idle';

  // Carousel data sources
  const panel = usePanel();
  const facultyMsg = useMessage('faculty');
  const hodMsg = useMessage('hod');
  const coordMsg = useMessage('studentCoord');

  // Decide which slides are actually shown — drop empty ones.
  // The QR is now only the persistent tile in the bottom KPI strip
  // (ScanKpi). The full-screen "Join the room" slide was removed because
  // it overflowed the carousel area on most viewports.
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
  const presenterMode = !!upNextTeam || awardsMode;

  useEffect(() => {
    if (presenterMode || slides.length <= 1) return;
    const id = window.setInterval(() => {
      setSlideIdx((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [presenterMode, slides.length]);

  useEffect(() => {
    // window.location.host is empty only when running on file:// — never
    // happens for our deployment, but keep a safe fallback to the literal
    // hostname so the QR still encodes something parseable rather than
    // "https:///".
    setHost(window.location.host || EVENT.fallbackHost);
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
    <div className="grid min-h-screen w-screen grid-rows-[auto_1fr_auto] gap-6 overflow-hidden p-8 md:p-12">
      {/* (The PRESS F / arrow-keys keyboard hint that used to live here
          overlapped the clock on the top-right and confused the audience
          who shouldn't be looking for keyboard shortcuts. Operator already
          knows F = fullscreen and arrow keys step the carousel.) */}

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5 font-display text-[22px] font-semibold tracking-tight text-ink">
          <BrandMark filled size={36} />
          <span>{EVENT.wordmark}</span>
          {EVENT.edition && (
            <span className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[13px] tracking-[0.18em] text-mute shadow-soft">
              {EVENT.edition}
            </span>
          )}
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
        {awardsMode ? (
          <AwardsStage results={reveal} />
        ) : presenterMode && upNextTeam ? (
          <PresenterStage team={upNextTeam} tally={upNextTally} endsInMs={(state.phase?.end ?? now.getTime()) - now.getTime()} />
        ) : (
          <CarouselStage
            slides={slides}
            currentIdx={slideIdx}
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

      {/* Bottom strip — 4 KPI tiles in a single row. The Scan tile is
          one of the four (~120px QR + label) so the bottom band stays at
          a normal KPI strip height and the carousel keeps full vertical
          space for editorial slides. */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Teams registered" figure={String(teamCount)} sub={`OF ${EVENT.expectedTeams} EXPECTED`} figureClass="text-accent" />
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
        <Kpi label="Event window" figure={`${DOORS_TIME} → ${WRAP_TIME}`} sub={`${EVENT_DATE_SHORT} · ${EVENT.tzLabel}`.toUpperCase()} figureClass="text-[clamp(22px,2.2vw,30px)]" />
        <ScanKpi host={host} />
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
  slides, currentIdx, now, state, panel, facultyMsg, hodMsg, coordMsg,
}: {
  slides: SlideId[];
  currentIdx: number;
  now: Date;
  state: ReturnType<typeof useEventPhase>['state'];
  panel: PanelMember[];
  facultyMsg: ScreenMessage;
  hodMsg: ScreenMessage;
  coordMsg: ScreenMessage;
}) {
  // True cross-fade: every slide is mounted simultaneously and absolute-
  // positioned over the same area, with opacity tweening on transition.
  // The previous slide finishes fading out while the next is fading in -
  // no visible "stop" moment between slides. Slides that aren't in the
  // active list at all are not rendered.
  const current = slides[currentIdx];

  const renderSlideById = (id: SlideId) => {
    switch (id) {
      case 'phase':        return <PhaseSlide now={now} state={state} />;
      case 'about':        return <AboutSlide />;
      case 'panel':        return <PanelSlide members={panel} />;
      case 'faculty':      return <MessageSlide kicker={EVENT.messageSlots.faculty.label}      msg={facultyMsg} accent="primary" />;
      case 'hod':          return <MessageSlide kicker={EVENT.messageSlots.hod.label}          msg={hodMsg}     accent="accent" />;
      case 'studentCoord': return <MessageSlide kicker={EVENT.messageSlots.studentCoord.label} msg={coordMsg}   accent="spark" />;
    }
  };

  return (
    <div className="relative h-full w-full max-w-[1500px]">
      {slides.map((id) => {
        const active = id === current;
        return (
          <div
            key={id}
            className={`absolute inset-0 flex flex-col items-center justify-center text-center transition-all ease-out ${
              active
                ? 'opacity-100 translate-y-0 duration-[1400ms]'
                : 'opacity-0 -translate-y-2 duration-[900ms] pointer-events-none'
            }`}
            aria-hidden={!active}
          >
            {renderSlideById(id)}
          </div>
        );
      })}
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
        <HeroWordmark />
        <Subtitle>
          {capitalize(numberWord(EVENT.expectedTeams))} teams. {EVENT.durationLabel}. <b>{EVENT.tagline}</b>
        </Subtitle>
        <Countdown label="Starts in">{formatCountdown(ms)}</Countdown>
      </>
    );
  }
  if ((state.status === 'live' || state.status === 'override') && state.phase) {
    const ms = state.phase.end - now.getTime();
    const tone = state.phase.id === 'wrap' || state.status === 'override' ? 'spark' : 'primary';
    const prefix = state.status === 'override' ? 'Override · ' : '';
    const cfg = PHASE_CONFIG[state.phase.id];
    const next = state.next ? PHASE_CONFIG[state.next.id] : null;
    return (
      <>
        <Eyebrow tone={tone}>{prefix}{state.phase.label}</Eyebrow>
        <Title>{PHASE_TITLES[state.phase.id]}</Title>
        <Subtitle>
          {cfg.line}{' '}
          {next && <b>{next.label.split(' · ').pop()} at {to12h(next.start)}.</b>}
        </Subtitle>
        {next && <Countdown label={`${next.short.toLowerCase().replace(/^./, (c) => c.toUpperCase())} in`}>{formatHHMMSS(ms)}</Countdown>}
      </>
    );
  }
  // post
  return (
    <>
      <Eyebrow tone="spark">Complete</Eyebrow>
      <Title>Thank you.</Title>
      <Subtitle>{EVENT.name} has concluded. <b>Until the next one.</b></Subtitle>
    </>
  );
}

const PHASE_CONFIG = Object.fromEntries(EVENT.schedule.map((p) => [p.id, p])) as Record<PhaseId, (typeof EVENT.schedule)[number]>;

const PHASE_TITLES: Record<PhaseId, string> = {
  phase1: 'Welcome.',
  phase2: 'Build.',
  lunch:  'Recharge.',
  phase3: 'Up next…',
  wrap:   'Thank you.',
};

// ─── Slide · About the event ─────────────────────────────────────────────────

function AboutSlide() {
  return (
    <>
      <Eyebrow tone="accent">About</Eyebrow>
      {/* Slightly tighter type than the original; on 1080p the carousel
          area is around 600px tall and the two-line h1 + paragraph + tick
          row needs to fit cleanly. clamp() upper bound 110px (was 140px)
          keeps two lines at ~200px total instead of ~260px. */}
      <h1 className="mb-6 font-display text-[clamp(40px,7vw,110px)] font-extrabold leading-[0.95] tracking-[-0.035em] text-ink">
        {capitalize(numberWord(EVENT.expectedTeams))} teams.
        <br />
        <span className="font-serif italic font-light text-accent">One day to ship.</span>
      </h1>
      <p className="mx-auto max-w-[1100px] text-[clamp(16px,1.9vw,24px)] leading-snug text-ink-2">
        {EVENT.name} is a one-day live {EVENT.kind.toLowerCase()}. From <b>{to12h(DOORS_TIME)} to {to12h(WRAP_TIME)}</b>, {numberWord(EVENT.expectedTeams)} teams move through the day &mdash;
        {EVENT.schedule.filter((p) => p.id !== 'lunch').map((p, i, arr) => (
          <span key={p.id}><b style={{ color: p.tint }}> {p.label.split(' · ').pop()}</b>{i < arr.length - 1 ? ' ·' : ''}</span>
        ))} &mdash;
        and end with a panel decision on {JUDGING_CRITERIA.length} honest criteria.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 font-mono text-[clamp(11px,1.3vw,16px)] uppercase tracking-[0.28em] text-mute">
        <AboutTick label={String(EVENT.expectedTeams)} sub="teams" />
        <AboutTick label={String(Math.round((eventTime(WRAP_TIME) - eventTime(DOORS_TIME)) / 3_600_000))} sub="hours" />
        <AboutTick label={String(JUDGING_CRITERIA.length)} sub="criteria" />
        <AboutTick label="1" sub={`day · ${EVENT_DATE_SHORT}`} />
      </div>
    </>
  );
}

function AboutTick({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-display text-[clamp(28px,3.6vw,52px)] font-bold text-ink">{label}</span>
      <span className="text-mute">{sub}</span>
    </div>
  );
}

// (JoinSlide was removed - the full-screen QR slide overflowed the
// carousel area on most viewports. The persistent QR tile in the bottom
// KPI strip is enough; a "Show QR" link on the landing Hero opens the
// dedicated /qr poster page for anyone who needs to display it at scale.)

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
        {capitalize(numberWord(JUDGING_CRITERIA.length))} criteria — {JUDGING_CRITERIA.map((c) => c.name.toLowerCase()).join(', ')} — scored 0&ndash;10 per team.
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
        className="mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full font-display text-[20px] font-bold tracking-tight text-bg md:h-20 md:w-20 md:text-[24px]"
        style={{ background: member.color }}
      >
        {member.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{initialsOf(member.name)}</span>
        )}
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

// ─── Slide · Message (coordinator-written slots) ────────────────────────────

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

/**
 * The hero wordmark on the /screen pre-event slide. One uniform string so
 * the spelling reads correctly from the back of the room. Gradient slowly
 * shifts horizontally for life without overlapping or rotating any letter.
 */
function HeroWordmark() {
  return (
    <div className="mb-8 flex flex-col items-center">
      <h1
        className="font-display text-[clamp(64px,13vw,220px)] font-extrabold leading-[0.92] tracking-[-0.04em] bg-gradient-brand bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-shift"
      >
        {EVENT.wordmark}
      </h1>
      <div className="mt-4 flex items-center gap-3 font-mono text-[clamp(11px,1.3vw,16px)] uppercase tracking-[0.42em] text-mute">
        <span className="h-px w-12 bg-line-2" />
        <span>{EVENT.edition ? `Edition ${EVENT.edition} · ` : ''}{EVENT_DATE_LONG}</span>
        <span className="h-px w-12 bg-line-2" />
      </div>
    </div>
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

/**
 * Persistent scan-to-join tile that sits as one of the four KPI cards
 * in the bottom strip. Same height as the other Kpi components so the
 * row stays a normal KPI strip and the carousel keeps full height.
 *
 * Host is null until the post-hydration effect reads window.location.host;
 * rendering a placeholder until then avoids briefly encoding a wrong
 * fallback URL that anyone scanning at that instant would land on.
 */
function ScanKpi({ host }: { host: string | null }) {
  if (!host) {
    return (
      <div className="rounded-2xl border border-accent/40 bg-surface px-5 py-4 shadow-soft">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Scan to join</div>
        <div className="mt-2 font-mono text-[12px] text-mute">Preparing&hellip;</div>
      </div>
    );
  }
  const url = `https://${host}/`;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-surface px-4 py-3 shadow-soft">
      <div className="shrink-0 rounded-lg bg-ink p-1.5">
        <QrTile value={url} size={84} fg="#0A0B14" bg="#F5F3EE" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
          Scan to join
        </div>
        <div className="font-display text-[clamp(15px,1.4vw,20px)] font-bold leading-tight tracking-tight text-ink">
          Open anytime
        </div>
        <div className="mt-1 truncate font-mono text-[10px] tracking-[0.08em] text-mute">
          {host}
        </div>
      </div>
    </div>
  );
}
