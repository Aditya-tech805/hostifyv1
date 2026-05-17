'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Landing — the marketing surface shown to participants who haven't registered.
// Replaces the centered hero + register card the page used to show.
//
// Shape: editorial event poster scaled to the web. Date as the hero, schedule
// as the spine, real activity previews, then register. Lives in one file so
// the narrative arc reads top-to-bottom for whoever edits it next.
// ─────────────────────────────────────────────────────────────────────────────

import { BrandMark } from './BrandMark';
import { ClientOnly } from './ClientOnly';
import { RegisterForm } from './RegisterForm';
import { useEventPhase } from '@/lib/hooks';
import { useAllTeams, usePanel, type PanelMember } from '@/lib/data';
import { SCHEDULE, formatCountdown, pad, type PhaseId, type Phase } from '@/lib/schedule';
import { IDEA_PROMPTS, BINGO_MISSIONS, PITCH_STEPS } from '@/lib/activities';
import type { Team } from '@/lib/teams';

interface LandingProps {
  initial?: Team;
  onSubmit: (team: Team) => void;
}

export function Landing({ initial, onSubmit }: LandingProps) {
  return (
    <>
      <Hero />
      <TeamsMarquee />
      <PhaseSpine />
      <ActivityShowcase />
      <Voices />
      <JuryPanel />
      <RegisterSection initial={initial} onSubmit={onSubmit} />
      <LandingFooter />
    </>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Signature one-shot sweep — a hairline crossing the viewport on mount. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[48%] h-px overflow-hidden">
        <div className="h-px w-full origin-left bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-sweep-x" />
      </div>

      <div className="mx-auto flex min-h-[88vh] max-w-[1320px] flex-col px-6 pb-16 pt-10 md:min-h-[92vh] md:pb-20 md:pt-14">
        {/* Eyebrow — just two beats, lots of air around them */}
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-mute">
          <ClientOnly fallback={<span className="opacity-60">···</span>}>
            <HeroStatusInline />
          </ClientOnly>
          <span>Edition &apos;26</span>
        </div>

        {/* The mark — sits in the visual centre of the viewport.
            Note: previously rendered "INNOVATR" + an animated <span>X</span>
            which was *literally* missing the second I in source — the rotation
            on the X also distracted attention from the missing letter. Now
            spelt out in full, with the X kept as the brand-accent colour
            using a slow horizontal gradient drift (no rotation, no overlap). */}
        <div className="flex flex-1 items-center">
          <h1 className="w-full animate-reveal-up font-display font-extrabold leading-[0.82] tracking-[-0.05em] text-ink text-[clamp(44px,15.5vw,240px)]">
            INNOVATRI<span className="bg-gradient-brand bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-shift">X</span>
          </h1>
        </div>

        {/* Bottom block — concert-poster time band, tagline, CTA */}
        <div className="animate-reveal-up" style={{ animationDelay: '160ms' }}>
          {/* Doors / Stage / Wrap — the most event-coded gesture we have */}
          <div className="grid grid-cols-3 items-end border-y border-line-2 py-4">
            <TimeStamp label="Doors" value="09:30" />
            <TimeStamp label="Stage" value="10:00" highlight />
            <TimeStamp label="Wrap"  value="16:15" alignRight />
          </div>
          <div className="mt-2 text-center font-mono text-[clamp(10px,1vw,12px)] uppercase tracking-[0.32em] text-mute tabular-nums">
            Monday · 18 May 2026 · IST
          </div>

          <div className="mt-10 grid items-end gap-8 md:mt-14 md:grid-cols-[1fr_auto]">
            <p className="font-display text-[clamp(30px,4.4vw,52px)] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
              Twenty-four teams. Six hours.{' '}
              <span className="font-serif italic font-light text-primary">One day.</span>
            </p>

            <div className="flex flex-col items-start gap-3 md:items-end">
              <a
                href="#register"
                className="group inline-flex items-center gap-3 rounded-full bg-ink px-7 py-4 font-display text-[15px] font-semibold text-bg shadow-soft-lg transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-glow-lg"
              >
                Get on the bill
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a
                href="#the-day"
                className="group inline-flex items-center gap-1.5 px-2 font-mono text-[10px] uppercase tracking-[0.24em] text-mute transition-colors hover:text-ink"
              >
                see the lineup
                <span className="transition-transform group-hover:translate-y-0.5">↓</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TimeStamp({
  label, value, highlight, alignRight,
}: { label: string; value: string; highlight?: boolean; alignRight?: boolean }) {
  return (
    <div className={alignRight ? 'text-right' : highlight ? 'text-center' : ''}>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.32em] text-mute">{label}</div>
      <div className={`font-display tabular-nums leading-none tracking-[-0.02em] ${
        highlight
          ? 'text-[clamp(26px,6vw,72px)] font-extrabold text-ink'
          : 'text-[clamp(18px,3.5vw,40px)] font-semibold text-ink-2'
      }`}>
        {value}
      </div>
    </div>
  );
}

function HeroStatusInline() {
  const { now, state } = useEventPhase();

  if (state.status === 'pre' && state.next) {
    const ms = state.next.start - now.getTime();
    const cd = formatCountdown(ms).replace(/\s+\d+s$/, '');
    return (
      <span className="flex items-center gap-2 text-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-dot-pulse" />
        Live in {cd}
      </span>
    );
  }
  if ((state.status === 'live' || state.status === 'override') && state.phase) {
    return (
      <span className="flex items-center gap-2 font-semibold text-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-dot-pulse" />
        Live now · {state.phase.short}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 text-mute">
      <span className="h-1.5 w-1.5 rounded-full bg-mute" />
      Event complete
    </span>
  );
}

// ─── Teams marquee ───────────────────────────────────────────────────────────

function TeamsMarquee() {
  const teams = useAllTeams();
  const SLOTS = 24;
  const placeholderCount = Math.max(0, SLOTS - teams.length);

  // Render the row twice for a seamless wrap with `translateX(-50%)`.
  const row = (
    <div className="flex shrink-0 items-center gap-12 px-6">
      {teams.map((t) => (
        <span
          key={t.id}
          className="flex items-center gap-3 font-display text-[clamp(20px,2.4vw,28px)] font-semibold tracking-tight"
        >
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: t.color }} />
          <span className="text-white">{t.name}</span>
          <span className="font-mono text-[12px] tracking-[0.2em] text-white/40">
            {String(t.members.length).padStart(2, '0')}
          </span>
        </span>
      ))}
      {Array.from({ length: placeholderCount }).map((_, idx) => (
        <span
          key={`p-${idx}`}
          className="flex items-center gap-3 font-mono text-[clamp(14px,1.6vw,18px)] uppercase tracking-[0.22em] text-white/30"
        >
          <span className="h-3.5 w-3.5 rounded-full border border-white/30" />
          Team {String(teams.length + idx + 1).padStart(2, '0')} · open
        </span>
      ))}
    </div>
  );

  return (
    <section
      aria-label="Registered teams"
      className="relative border-y border-line bg-surface-2 py-6 text-ink"
    >
      {/* Side fade masks */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-surface-2 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-surface-2 to-transparent" />

      <div className="flex w-max animate-marquee whitespace-nowrap">
        {row}
        {row}
      </div>

      <div className="pointer-events-none absolute inset-x-0 -top-3 flex justify-center">
        <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.28em] text-ink-2 ring-1 ring-line-2">
          {teams.length > 0
            ? `${teams.length} of ${SLOTS} teams locked in`
            : 'Be team 01 · seats open'}
        </span>
      </div>
    </section>
  );
}

// ─── Phase spine ─────────────────────────────────────────────────────────────

const PHASES_META: Record<PhaseId, { sub: string; tint: string; tintBg: string; activities: string[]; line: string }> = {
  phase1: {
    sub: 'Doors open. Welcome. Seat allotments.',
    tint: '#4F46E5',
    tintBg: 'rgba(79, 70, 229, 0.05)',
    activities: ['Registration', 'Opening ceremony', 'Seat allotments'],
    line: 'Twenty-four teams arrive, settle in, and meet the day.',
  },
  phase2: {
    sub: 'Brainstorm. Prototype. Sharpen the pitch.',
    tint: '#06B6D4',
    tintBg: 'rgba(6, 182, 212, 0.05)',
    activities: ['Idea cards', 'Networking bingo', 'Pitch lab', 'Photo booth', 'Spotlight'],
    line: 'Just over two hours of crafted chaos — prompts, missions, refreshments, and a spotlight moment from the stage.',
  },
  lunch: {
    sub: 'Catch your breath. Eat warm food.',
    tint: '#F59E0B',
    tintBg: 'rgba(245, 158, 11, 0.05)',
    activities: ['Reset', 'Recharge'],
    line: 'The one hour of the day where nobody is keeping score.',
  },
  phase3: {
    sub: 'Present. Get judged. Land it.',
    tint: '#7C3AED',
    tintBg: 'rgba(124, 58, 237, 0.05)',
    activities: ['Team presentations', 'Judge scoring', 'Audience reactions'],
    line: 'Five criteria, a full panel, one audience. Sometimes the audience out-votes everyone.',
  },
  wrap: {
    sub: 'Vote of thanks. Awards. The long exhale.',
    tint: '#EF4444',
    tintBg: 'rgba(239, 68, 68, 0.05)',
    activities: ['Faculty address', 'Awards ceremony', 'Group photo'],
    line: 'One winner. Twenty-three teams that just spent a day getting sharper. Nobody loses that.',
  },
};

function PhaseSpine() {
  return (
    <section id="the-day" className="mx-auto max-w-[1320px] px-6 py-24 md:py-36">
      <header className="mb-12 grid gap-10 md:mb-20 md:grid-cols-[1fr_2fr] md:gap-16">
        <div>
          <div className="mb-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-mute">
            <span className="h-px w-8 bg-line-2" />
            The program
          </div>
          <h2 className="font-display text-[clamp(40px,5.5vw,72px)] font-bold leading-[0.98] tracking-[-0.025em] text-ink">
            Five phases.<br />
            <span className="font-serif italic font-light text-primary">One arc.</span>
          </h2>
        </div>
        <p className="font-display text-[clamp(18px,2vw,22px)] leading-[1.55] text-ink-2 md:pt-8">
          Every minute is scripted; almost nothing is staged. Same schedule on every phone, every projector, every console — when a phase goes live, the whole room shifts at once.
        </p>
      </header>

      <ClientOnly fallback={<PhaseSpineFallback />}>
        <PhaseSpineLive />
      </ClientOnly>
    </section>
  );
}

function PhaseSpineFallback() {
  return (
    <ol className="space-y-0">
      {SCHEDULE.map((p, i) => (
        <li key={p.id} className="border-y border-line-2 py-8" />
      ))}
    </ol>
  );
}

function PhaseSpineLive() {
  const { state } = useEventPhase();
  const livePhaseId = state.status === 'live' || state.status === 'override' ? state.phase?.id : null;
  return (
    <ol className="space-y-0">
      {SCHEDULE.map((p, i) => (
        <PhaseRow key={p.id} phase={p} idx={i} isLive={livePhaseId === p.id} />
      ))}
    </ol>
  );
}

function PhaseRow({ phase, idx, isLive }: { phase: Phase; idx: number; isLive: boolean }) {
  const meta = PHASES_META[phase.id];
  const startStr = fmtTime(phase.start);
  const endStr = fmtTime(phase.end);

  return (
    <li
      className="group relative grid items-start gap-6 border-t border-line-2 py-8 last:border-b md:grid-cols-[90px_1fr_1.6fr_180px] md:gap-10 md:py-12"
      style={isLive ? { background: meta.tintBg } : undefined}
    >
      {isLive && (
        <span
          aria-hidden
          className="absolute -left-2 top-0 h-full w-1 rounded-r-full"
          style={{ background: meta.tint, boxShadow: `0 0 24px ${meta.tint}` }}
        />
      )}

      <div
        className="font-display text-[clamp(40px,5vw,64px)] font-extrabold leading-none tracking-[-0.04em] tabular-nums"
        style={{ color: meta.tint }}
      >
        {String(idx + 1).padStart(2, '0')}
      </div>

      <div>
        <h3 className="font-display text-[clamp(24px,2.6vw,34px)] font-semibold leading-tight tracking-[-0.015em] text-ink">
          {phase.short}
        </h3>
        <p className="mt-2 font-serif italic font-light text-[clamp(15px,1.6vw,18px)] text-ink-2">
          {meta.sub}
        </p>
      </div>

      <div>
        <p className="text-[clamp(14.5px,1.5vw,16px)] leading-relaxed text-ink-2">{meta.line}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {meta.activities.map((a) => (
            <span
              key={a}
              className="rounded-full border border-line-2 bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2"
            >
              {a}
            </span>
          ))}
        </div>
      </div>

      <div className="md:text-right font-mono">
        <div className="text-[11px] uppercase tracking-[0.22em] text-mute">{phase.short}</div>
        <div className="mt-1 font-display text-[clamp(18px,1.8vw,22px)] font-semibold tabular-nums text-ink">
          {startStr} → {endStr}
        </div>
        {isLive && (
          <div
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.22em] text-white"
            style={{ background: meta.tint }}
          >
            <span className="h-1 w-1 animate-dot-pulse rounded-full bg-white" />
            Live now
          </div>
        )}
      </div>
    </li>
  );
}

// ─── Activity showcase ───────────────────────────────────────────────────────

function ActivityShowcase() {
  return (
    <section id="activities" className="mx-auto max-w-[1320px] px-6 py-24 md:py-36">
      <header className="mb-12 grid gap-10 md:mb-20 md:grid-cols-[1fr_2fr] md:gap-16">
        <div>
          <div className="mb-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-mute">
            <span className="h-px w-8 bg-line-2" />
            On the floor
          </div>
          <h2 className="font-display text-[clamp(40px,5.5vw,72px)] font-bold leading-[0.98] tracking-[-0.025em] text-ink">
            Things to do<br />
            <span className="font-serif italic font-light text-accent">between phases.</span>
          </h2>
        </div>
        <p className="font-display text-[clamp(18px,2vw,22px)] leading-[1.55] text-ink-2 md:pt-8">
          Stuff that happens when the room needs a kick. On your phone, on the projector, on a wall. Pick one when the energy dips.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <ShowcaseCard title="Idea Card Roulette" tag="Phase 2" tint="#06B6D4"
          preview={<IdeaSample />}
          description="Random pitch-sharpening prompts pulled from a deck of thirty. Tap, think, lock in. Built for the team that keeps saying &lsquo;we&rsquo;ll figure it out later.&rsquo;"
        />
        <ShowcaseCard title="Networking Bingo" tag="Phase 2" tint="#7C3AED"
          preview={<BingoSample />}
          description="Sixteen missions on a 4×4 grid. Cross paths with teams you wouldn&rsquo;t otherwise meet — and get a row before anyone else."
        />
        <ShowcaseCard title="Pitch Lab" tag="Phase 2" tint="#F59E0B"
          preview={<PitchSample />}
          description="Five steps, five questions, one tighter pitch. With live hints, word targets, and a brutally honest progress bar."
        />
        <ShowcaseCard title="Photo Booth" tag="All day" tint="#EF4444"
          preview={<BoothSample />}
          description="Branded frame, a shared room gallery, and a way to remember which table you sat at when this all started."
        />
      </div>
    </section>
  );
}

function ShowcaseCard({
  title, tag, tint, preview, description,
}: {
  title: string; tag: string; tint: string;
  preview: React.ReactNode; description: string;
}) {
  return (
    <article className="group rounded-3xl border border-line-2 bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-line-2 hover:shadow-soft-lg md:p-6">
      <div className="mb-5 overflow-hidden rounded-2xl">{preview}</div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-[22px] font-semibold leading-tight tracking-tight text-ink md:text-[26px]">
          {title}
        </h3>
        <span
          className="rounded-full px-2.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-white"
          style={{ background: tint }}
        >
          {tag}
        </span>
      </div>
      <p className="text-[14.5px] leading-relaxed text-ink-2">{description}</p>
    </article>
  );
}

function IdeaSample() {
  return (
    <div className="flex aspect-[16/9] flex-col justify-between rounded-2xl bg-surface-2 p-6 text-ink ring-1 ring-line">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-mute">
        Prompt 17 of 30
      </div>
      <p className="font-display text-[clamp(15px,1.8vw,20px)] font-medium leading-[1.3] text-ink">
        &ldquo;{IDEA_PROMPTS[16]}&rdquo;
      </p>
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
        <span className="text-mute">← Prev</span>
        <span className="rounded-full bg-accent px-3 py-1 font-bold text-bg">Next ↻</span>
      </div>
    </div>
  );
}

function BingoSample() {
  const items = BINGO_MISSIONS.slice(0, 16);
  const checked = new Set([0, 5, 6, 10, 14]);
  return (
    <div className="grid aspect-[16/9] grid-cols-4 gap-1.5 rounded-2xl bg-bg p-3 ring-1 ring-line">
      {items.map((m, i) => (
        <div
          key={i}
          className={`relative flex items-end overflow-hidden rounded-md p-1.5 text-[8px] leading-[1.15] ${
            checked.has(i)
              ? 'bg-secondary text-bg font-semibold'
              : 'bg-surface text-ink-2'
          }`}
        >
          {checked.has(i) && (
            <span className="absolute right-1 top-1 text-[10px]">✓</span>
          )}
          <span className="line-clamp-2">{m}</span>
        </div>
      ))}
    </div>
  );
}

function PitchSample() {
  return (
    <div className="flex aspect-[16/9] flex-col justify-between rounded-2xl bg-spark/[0.08] p-5">
      <div>
        <div className="mb-4 flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${i < 3 ? 'bg-spark' : 'bg-line-2'}`}
            />
          ))}
        </div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-spark">
          Step 03 of 05 · Who
        </div>
        <p className="font-display text-[clamp(15px,1.7vw,18px)] font-semibold leading-snug text-ink">
          {PITCH_STEPS[2].question}
        </p>
      </div>
      <p className="font-serif italic font-light text-[clamp(12px,1.3vw,14px)] leading-snug text-ink-2">
        {PITCH_STEPS[2].hint}
      </p>
    </div>
  );
}

function BoothSample() {
  return (
    <div className="flex aspect-[16/9] items-center justify-center rounded-2xl bg-gradient-to-br from-danger/20 via-primary/15 to-accent/20 p-5">
      <div className="relative aspect-[4/5] h-full rounded-xl border-[6px] border-ink/85 bg-gradient-to-br from-surface-2 to-surface-3">
        <div className="absolute inset-2 grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="rounded-sm bg-ink/10" />
          ))}
        </div>
        <div className="absolute inset-x-2 bottom-2 rounded bg-bg/90 p-1.5 backdrop-blur-sm ring-1 ring-line">
          <div className="font-display text-[10px] font-extrabold leading-none tracking-tight text-ink">
            INNOVATRIX
          </div>
          <div className="mt-0.5 font-mono text-[7px] tracking-[0.22em] text-mute">
            TEAM 03 · 18.05.26
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Voices (messages from HOD, faculty coord, student coords) ─────────────

interface Voice {
  name: string;
  role: string;
  quote: string;
  accent: string;
}

const MESSAGES: Voice[] = [
  {
    name: 'Dev Baloni',
    role: 'Head of Department · Computer Science',
    quote: "Innovation begins where curiosity refuses to settle. Today, twenty-four teams will prove that the future of computer science doesn’t wait for permission — it builds, it questions, it ships. I’m proud of every team here.",
    accent: '#6366F1',
  },
  {
    name: 'Mukesh Pandey',
    role: 'Faculty Coordinator',
    quote: "What you build today won’t be remembered for being perfect. It’ll be remembered for being yours. Take the prompts seriously; take yourselves a little less so. Have a brilliant day.",
    accent: '#A78BFA',
  },
  {
    name: 'Aditya Pathak',
    role: 'Lead Student Coordinator',
    quote: "This day started as a sketch in a notebook months ago. To see twenty-four teams walk in with ideas of their own is the only metric that matters. Go make something nobody’s seen before.",
    accent: '#22D3EE',
  },
  {
    name: 'Mayur Singh',
    role: 'Lead Student Coordinator',
    quote: "The hardest part of any event is the moment before doors open. The second hardest is watching everyone leave with their hands full. Here’s to the easy bit in between — have at it.",
    accent: '#FBBF24',
  },
];

function Voices() {
  return (
    <section className="border-t border-line bg-bg py-24 md:py-32">
      <div className="mx-auto max-w-[1320px] px-6">
        <header className="mb-12 grid gap-10 md:mb-16 md:grid-cols-[1fr_2fr] md:gap-16">
          <div>
            <div className="mb-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-mute">
              <span className="h-px w-8 bg-line-2" />
              Before doors open
            </div>
            <h2 className="font-display text-[clamp(36px,5vw,60px)] font-bold leading-[0.98] tracking-[-0.025em] text-ink">
              A few <span className="font-serif italic font-light text-primary">words.</span>
            </h2>
          </div>
          <p className="font-display text-[clamp(17px,1.8vw,20px)] leading-[1.55] text-ink-2 md:pt-6">
            From the people who built today — the department, the faculty, and the two students who carried it across the line.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          {MESSAGES.map((m) => <MessageCard key={m.name} {...m} />)}
        </div>
      </div>
    </section>
  );
}

function MessageCard({ name, role, quote, accent }: Voice) {
  const initials = makeInitials(name);
  return (
    <article
      className="group relative overflow-hidden rounded-3xl border border-line-2 bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg md:p-9"
      style={{ borderTopWidth: 2, borderTopColor: accent }}
    >
      {/* Decorative open-quote mark in the accent tint */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-4 left-6 font-serif font-light leading-none md:-top-6 md:left-8"
        style={{ color: `${accent}33`, fontSize: 'clamp(120px,14vw,180px)' }}
      >
        &ldquo;
      </div>
      <blockquote className="relative pt-10 font-serif italic font-light text-[clamp(17px,2vw,22px)] leading-[1.5] text-ink md:pt-12">
        {quote}
      </blockquote>
      <div className="mt-7 flex items-center gap-3.5 border-t border-line pt-5">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-[14px] font-bold tracking-tight text-bg"
          style={{ background: accent }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-semibold leading-tight tracking-tight text-ink">
            {name}
          </div>
          <div className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
            {role}
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Jury panel (judges shown to all teams) ─────────────────────────────────
// Data is curated by the coordinator from /console → "Judges panel". Stored
// in the synced `panel` kv tree so it appears on every device in real time.

function JuryPanel() {
  return (
    <section className="border-t border-line bg-bg py-24 md:py-32">
      <div className="mx-auto max-w-[1320px] px-6">
        <header className="mb-12 grid gap-10 md:mb-16 md:grid-cols-[1fr_2fr] md:gap-16">
          <div>
            <div className="mb-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-mute">
              <span className="h-px w-8 bg-line-2" />
              The panel
            </div>
            <h2 className="font-display text-[clamp(36px,5vw,60px)] font-bold leading-[0.98] tracking-[-0.025em] text-ink">
              Who&apos;s <span className="font-serif italic font-light text-accent">keeping score.</span>
            </h2>
          </div>
          <p className="font-display text-[clamp(17px,1.8vw,20px)] leading-[1.55] text-ink-2 md:pt-6">
            Five criteria — innovation, feasibility, presentation, impact, future potential — scored 0&ndash;10 per team. No applause meter, no audience vote on the panel side. Just honest sliders.
          </p>
        </header>

        <ClientOnly fallback={<JuryGridSkeleton />}>
          <JuryGridLive />
        </ClientOnly>
      </div>
    </section>
  );
}

function JuryGridLive() {
  const panel = usePanel();

  if (panel.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-line-2 bg-surface p-12 text-center md:p-16">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-bg ring-1 ring-line-2">
          <span className="font-display text-[22px] font-bold text-mute">?</span>
        </div>
        <div className="font-display text-[clamp(20px,2.5vw,28px)] font-semibold leading-tight tracking-tight text-ink">
          The panel is being <span className="font-serif italic font-light text-accent">finalised.</span>
        </div>
        <p className="mx-auto mt-3 max-w-[440px] text-[14px] leading-relaxed text-ink-2">
          Names go up here as soon as they&apos;re confirmed. The coordinator adds them from the console.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
      {panel.map((j) => <JudgeCard key={j.id} {...j} />)}
    </div>
  );
}

function JuryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-[136px] rounded-2xl border border-line-2 bg-surface/60 md:h-[156px]" />
      ))}
    </div>
  );
}

function JudgeCard({ name, role, color }: PanelMember) {
  const initials = makeInitials(name);
  return (
    <div className="group rounded-2xl border border-line-2 bg-surface p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-soft md:p-5">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full font-display text-[15px] font-bold tracking-tight text-bg md:h-14 md:w-14 md:text-[16px]"
        style={{ background: color }}
      >
        {initials}
      </div>
      <div className="font-display text-[15px] font-semibold leading-tight tracking-tight text-ink md:text-[16px]">
        {name}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-mute">
        {role}
      </div>
    </div>
  );
}

function makeInitials(name: string): string {
  const cleaned = name.replace(/[\[\]().]/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Register section ────────────────────────────────────────────────────────

function RegisterSection({ initial, onSubmit }: LandingProps) {
  return (
    <section
      id="register"
      className="relative border-t border-line bg-gradient-to-b from-bg to-surface"
    >
      <div className="mx-auto max-w-[1320px] px-6 py-24 md:py-36">
        <div className="grid items-start gap-12 md:grid-cols-[1fr_1.2fr] md:gap-20">
          <div className="md:sticky md:top-24">
            <div className="mb-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-mute">
              <span className="h-px w-8 bg-line-2" />
              The RSVP
            </div>
            <h2 className="font-display text-[clamp(48px,7vw,96px)] font-extrabold leading-[0.92] tracking-[-0.035em] text-ink">
              Be <span className="text-primary">team 01.</span>
            </h2>
            <p className="mt-6 max-w-[440px] font-display text-[clamp(17px,1.8vw,20px)] leading-[1.5] text-ink-2">
              One person fills this in for the team. Name, colour, members, the idea in one line. From there, the day rebuilds around what you submit.
            </p>
            <ul className="mt-8 space-y-3 font-mono text-[11.5px] uppercase tracking-[0.18em] text-mute">
              <li className="flex items-center gap-3">
                <span className="h-px w-6 bg-line-2" />
                <span>Under a minute</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-px w-6 bg-line-2" />
                <span>Live on every device</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-px w-6 bg-line-2" />
                <span>Locked at 10:45 sharp</span>
              </li>
            </ul>
          </div>

          <div>
            <RegisterForm initial={initial} onSubmit={onSubmit} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="border-t border-line bg-bg">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-6 px-6 py-12 font-mono text-[11px] uppercase tracking-[0.22em] text-mute">
        <div className="flex items-center gap-3">
          <BrandMark filled size={26} />
          <span className="font-display font-semibold tracking-tight text-ink">Innovatrix &apos;26</span>
          <span className="text-mute">· a student-coordinator production</span>
        </div>
        <div className="flex items-center gap-4 text-ink-2">
          <span>Doors at 10</span>
          <span className="text-line-2">·</span>
          <span>Wrap at 4</span>
          <span className="text-line-2">·</span>
          <span className="font-serif italic font-light text-ink normal-case tracking-normal text-[13px]">see you on the 18th.</span>
        </div>
      </div>
    </footer>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
