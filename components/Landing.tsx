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
import { useAllTeams } from '@/lib/data';
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
      <RegisterSection initial={initial} onSubmit={onSubmit} />
      <StakeholderStrip />
      <LandingFooter />
    </>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* A single accent sweep line that animates across on mount — the
         signature motion. Subtle but consistent across the rest of the site. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[44%] h-px overflow-hidden">
        <div className="h-px w-full origin-left bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-sweep-x" />
      </div>

      <div className="mx-auto max-w-[1320px] px-6 pt-10 md:pt-14">
        {/* Eyebrow strip */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.28em] text-mute">
          <span className="flex items-center gap-2 text-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-dot-pulse" />
            Edition 02
          </span>
          <span className="text-line-2">/</span>
          <span>Sixteen teams</span>
          <span className="text-line-2">/</span>
          <span>One live day</span>
          <span className="ml-auto flex items-center gap-2">
            <ClientOnly fallback={<span className="text-mute">···</span>}>
              <LiveStatusInline />
            </ClientOnly>
          </span>
        </div>

        {/* The mark — full bleed within the container, no centering. */}
        <h1 className="mt-10 md:mt-14 font-display font-extrabold leading-[0.82] tracking-[-0.045em] text-ink text-[clamp(72px,17vw,240px)] animate-reveal-up">
          INNOVATR<span className="inline-block animate-x-cycle bg-gradient-brand bg-clip-text text-transparent">X</span>
        </h1>

        {/* Date band — rule-flanked grid, the most poster-ish moment */}
        <div className="mt-6 border-y border-ink/15">
          <div className="grid grid-cols-2 gap-y-3 py-5 md:grid-cols-4 md:gap-x-6">
            <DateCell label="Day"   value="Monday" />
            <DateCell label="Date"  value="May 18, 2026" />
            <DateCell label="Hours" value="10 AM → 4 PM" />
            <DateCell label="Zone"  value="IST · UTC+5:30" />
          </div>
        </div>

        {/* Tagline + live status pill + CTAs — two-column asymmetric */}
        <div className="mt-12 grid items-start gap-x-12 gap-y-10 md:mt-16 md:grid-cols-[1.45fr_1fr]">
          <div className="animate-reveal-up" style={{ animationDelay: '120ms' }}>
            <p className="font-display text-[clamp(26px,3.5vw,44px)] leading-[1.15] tracking-[-0.01em] text-ink">
              Not a hackathon. Not a pitch competition.{' '}
              <span className="font-serif italic font-light text-primary">A six-hour experiment</span>{' '}
              in what sixteen student teams can prove about the future they&apos;re already building.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#register"
                className="group inline-flex items-center gap-3 rounded-full bg-ink px-6 py-3.5 font-display text-[15px] font-semibold text-white shadow-soft-lg transition-all hover:-translate-y-0.5 hover:bg-primary hover:shadow-glow-lg"
              >
                Register your team
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a
                href="#the-day"
                className="group inline-flex items-center gap-2 rounded-full border border-line-2 bg-white/70 px-6 py-3.5 font-display text-[15px] font-semibold text-ink-2 backdrop-blur-sm transition-colors hover:border-ink hover:text-ink"
              >
                Explore the day
                <span className="transition-transform group-hover:translate-y-0.5">↓</span>
              </a>
            </div>
          </div>

          <div className="animate-reveal-up" style={{ animationDelay: '220ms' }}>
            <ClientOnly fallback={<LivePillFallback />}>
              <LiveStatusPill />
            </ClientOnly>
          </div>
        </div>

        {/* Bottom rail — a measured-tape feel beneath the hero */}
        <div className="mt-14 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-mute md:mt-20">
          <span className="h-px flex-1 bg-line-2" />
          <span>Scroll for the day</span>
          <span className="h-px w-12 bg-line-2" />
        </div>
      </div>
    </section>
  );
}

function DateCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.24em] text-mute">{label}</div>
      <div className="font-display text-[clamp(18px,2.4vw,26px)] font-semibold tracking-tight text-ink">{value}</div>
    </div>
  );
}

function LiveStatusInline() {
  const { now, state } = useEventPhase();
  if (state.status === 'pre' && state.next) {
    return <>T–{formatCountdown(state.next.start - now.getTime()).replace(/\s+\d+s$/, '')}</>;
  }
  if ((state.status === 'live' || state.status === 'override') && state.phase) {
    return <span className="text-primary">Live: {state.phase.short}</span>;
  }
  return <>Complete</>;
}

function LivePillFallback() {
  return <div className="h-[148px] rounded-3xl border border-line-2 bg-white/60" />;
}

function LiveStatusPill() {
  const { now, state } = useEventPhase();

  if (state.status === 'pre' && state.next) {
    const ms = state.next.start - now.getTime();
    return (
      <div className="rounded-3xl border-2 border-primary/25 bg-white p-6 shadow-soft">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
          Countdown to live
        </div>
        <div className="font-display text-[clamp(34px,5vw,52px)] font-bold leading-none tabular-nums tracking-tight text-ink">
          {formatCountdown(ms)}
        </div>
        <div className="mt-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">
          <span className="h-px w-6 bg-line-2" />
          Until {state.next.short} · {fmtTime(state.next.start)}
        </div>
      </div>
    );
  }

  if ((state.status === 'live' || state.status === 'override') && state.phase) {
    const ms = state.phase.end - now.getTime();
    return (
      <div className="rounded-3xl border-2 border-accent/40 bg-accent/[0.05] p-6 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2 w-2 animate-dot-pulse rounded-full bg-accent" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-accent">
            Live · right now
          </span>
        </div>
        <div className="font-display text-[clamp(22px,3vw,28px)] font-semibold leading-tight tracking-tight text-ink">
          {state.phase.label}
        </div>
        <div className="mt-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2 tabular-nums">
          <span className="h-px w-6 bg-line-2" />
          Ends in {formatCountdown(ms)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-line-2 bg-surface-2 p-6">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-mute">Status</div>
      <div className="font-display text-[22px] font-semibold leading-tight text-ink">
        Event complete.<br />
        <span className="font-serif italic font-light text-ink-2">See you in &apos;27.</span>
      </div>
    </div>
  );
}

// ─── Teams marquee ───────────────────────────────────────────────────────────

function TeamsMarquee() {
  const teams = useAllTeams();
  const SLOTS = 16;
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
      className="relative border-y border-ink/15 bg-ink py-6 text-white"
    >
      {/* Side fade masks */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink to-transparent" />

      <div className="flex w-max animate-marquee whitespace-nowrap">
        {row}
        {row}
      </div>

      <div className="pointer-events-none absolute inset-x-0 -top-3 flex justify-center">
        <span className="rounded-full bg-ink px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.28em] text-white/70 ring-1 ring-white/15">
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
    sub: 'Open the room. Set the tone.',
    tint: '#4F46E5',
    tintBg: 'rgba(79, 70, 229, 0.05)',
    activities: ['Registration', 'Welcome', 'Brand reveal'],
    line: 'Sixteen teams arrive. The day belongs to whoever shows up the most awake.',
  },
  phase2: {
    sub: 'Make stuff. Bump into people. Talk loud.',
    tint: '#06B6D4',
    tintBg: 'rgba(6, 182, 212, 0.05)',
    activities: ['Idea cards', 'Networking bingo', 'Pitch lab', 'Photo booth'],
    line: 'Three hours of crafted chaos — prompts, missions, a pitch sprint, and a wall of selfies.',
  },
  lunch: {
    sub: 'Catch your breath. Eat warm food.',
    tint: '#F59E0B',
    tintBg: 'rgba(245, 158, 11, 0.05)',
    activities: ['Reset', 'Recharge'],
    line: 'The only thirty minutes of the day where nobody is keeping score.',
  },
  phase3: {
    sub: 'Pitch. Vote. Land it.',
    tint: '#7C3AED',
    tintBg: 'rgba(124, 58, 237, 0.05)',
    activities: ['Final pitches', 'Judge scoring', 'Audience reactions'],
    line: 'Five criteria, five judges, one audience. Sometimes the audience out-votes everyone.',
  },
  wrap: {
    sub: 'Results, photos, the long exhale.',
    tint: '#EF4444',
    tintBg: 'rgba(239, 68, 68, 0.05)',
    activities: ['Reveal', 'Group photo', 'Goodbyes'],
    line: 'One winner. Fifteen teams that just spent a day getting sharper. Nobody loses that.',
  },
};

function PhaseSpine() {
  return (
    <section id="the-day" className="mx-auto max-w-[1320px] px-6 py-24 md:py-36">
      <header className="mb-12 grid gap-10 md:mb-20 md:grid-cols-[1fr_2fr] md:gap-16">
        <div>
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-mute">
            Section 01 · The day
          </div>
          <h2 className="font-display text-[clamp(40px,5.5vw,72px)] font-bold leading-[0.98] tracking-[-0.025em] text-ink">
            Five phases.<br />
            <span className="font-serif italic font-light text-primary">One arc.</span>
          </h2>
        </div>
        <p className="font-display text-[clamp(18px,2vw,22px)] leading-[1.55] text-ink-2 md:pt-8">
          Every minute is scripted; almost nothing is staged. The schedule below is the same one your phone, the projector, and the coordinator&apos;s console all read from — when a phase goes live, the whole room shifts at once.
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
              className="rounded-full border border-line-2 bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2"
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
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-mute">
            Section 02 · Activities
          </div>
          <h2 className="font-display text-[clamp(40px,5.5vw,72px)] font-bold leading-[0.98] tracking-[-0.025em] text-ink">
            Built for<br />
            <span className="font-serif italic font-light text-accent">restless rooms.</span>
          </h2>
        </div>
        <p className="font-display text-[clamp(18px,2vw,22px)] leading-[1.55] text-ink-2 md:pt-8">
          Mini-experiences engineered for the moments when energy dips. Tap-friendly on a phone, projector-ready when the spotlight hits.
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
    <article className="group rounded-3xl border border-line-2 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg md:p-6">
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
    <div className="flex aspect-[16/9] flex-col justify-between rounded-2xl bg-ink p-6 text-white">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
        Prompt 17 of 30
      </div>
      <p className="font-display text-[clamp(15px,1.8vw,20px)] font-medium leading-[1.3] text-white">
        &ldquo;{IDEA_PROMPTS[16]}&rdquo;
      </p>
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
        <span className="text-white/40">← Prev</span>
        <span className="rounded-full bg-accent px-3 py-1 font-bold text-white">Next ↻</span>
      </div>
    </div>
  );
}

function BingoSample() {
  const items = BINGO_MISSIONS.slice(0, 16);
  const checked = new Set([0, 5, 6, 10, 14]);
  return (
    <div className="grid aspect-[16/9] grid-cols-4 gap-1.5 rounded-2xl bg-surface-2 p-3">
      {items.map((m, i) => (
        <div
          key={i}
          className={`relative flex items-end overflow-hidden rounded-md p-1.5 text-[8px] leading-[1.15] ${
            checked.has(i)
              ? 'bg-secondary text-white font-semibold'
              : 'bg-white text-ink-2'
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
    <div className="flex aspect-[16/9] items-center justify-center rounded-2xl bg-gradient-to-br from-danger/15 via-primary/10 to-accent/15 p-5">
      <div className="relative aspect-[4/5] h-full rounded-xl border-[6px] border-ink/80 bg-gradient-to-br from-surface-2 to-white">
        <div className="absolute inset-2 grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="rounded-sm bg-ink/5" />
          ))}
        </div>
        <div className="absolute inset-x-2 bottom-2 rounded bg-ink/90 p-1.5 backdrop-blur-sm">
          <div className="font-display text-[10px] font-extrabold leading-none tracking-tight text-white">
            INNOVATRIX
          </div>
          <div className="mt-0.5 font-mono text-[7px] tracking-[0.22em] text-white/70">
            TEAM 03 · 18.05.26
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Register section ────────────────────────────────────────────────────────

function RegisterSection({ initial, onSubmit }: LandingProps) {
  return (
    <section
      id="register"
      className="relative border-t border-line bg-gradient-to-b from-white to-surface-2"
    >
      <div className="mx-auto max-w-[1320px] px-6 py-24 md:py-36">
        <div className="grid items-start gap-12 md:grid-cols-[1fr_1.2fr] md:gap-20">
          <div className="md:sticky md:top-24">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-mute">
              Section 03 · Lock in
            </div>
            <h2 className="font-display text-[clamp(48px,7vw,96px)] font-extrabold leading-[0.92] tracking-[-0.035em] text-ink">
              Be <span className="text-primary">team 01.</span>
            </h2>
            <p className="mt-6 max-w-[440px] font-display text-[clamp(17px,1.8vw,20px)] leading-[1.5] text-ink-2">
              One person registers. Pick a name, a colour, list your members, and tell us your idea in one line. The rest of the day rebuilds around what you submit here.
            </p>
            <ul className="mt-8 space-y-3 font-mono text-[11.5px] uppercase tracking-[0.18em] text-mute">
              <li className="flex items-center gap-3">
                <span className="h-px w-6 bg-line-2" />
                <span>Takes under a minute</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-px w-6 bg-line-2" />
                <span>Synced live to every device</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-px w-6 bg-line-2" />
                <span>Editable until 10:45 AM</span>
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

// ─── Stakeholder strip ───────────────────────────────────────────────────────

function StakeholderStrip() {
  return (
    <section className="bg-ink py-20 text-white md:py-28">
      <div className="mx-auto max-w-[1320px] px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
              Section 04 · The crew
            </div>
            <h2 className="font-display text-[clamp(36px,5vw,60px)] font-bold leading-[0.98] tracking-[-0.025em] text-white">
              For the people <span className="font-serif italic font-light text-accent">running the day.</span>
            </h2>
          </div>
          <p className="max-w-[420px] text-[15px] leading-relaxed text-white/60">
            Same URL, different doors. Each surface is built for one job — phone-first for coordinators, slider-first for judges, projector-first for the big screen.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-3xl bg-white/10 md:grid-cols-3">
          <StakeholderTile
            href="/console"
            tag="Coordinator"
            title="Run the show."
            description="Phase override, spotlight wheel, timer, polls, sprints, reactions, results reveal. PIN-gated."
          />
          <StakeholderTile
            href="/judges"
            tag="Judges"
            title="Score the pitches."
            description="Five criteria, five sliders per team. Notes autosave. PIN-gated, name-tagged."
          />
          <StakeholderTile
            href="/screen"
            tag="Big screen"
            title="Project the day."
            description="Full-viewport phase-aware display. Press F for fullscreen. Reactions land here too."
          />
        </div>
      </div>
    </section>
  );
}

function StakeholderTile({
  href, tag, title, description,
}: {
  href: string; tag: string; title: string; description: string;
}) {
  return (
    <a
      href={href}
      className="group flex flex-col bg-ink p-8 transition-colors hover:bg-[#13131c] md:p-10"
    >
      <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.26em] text-white/40">
        {tag}
      </div>
      <h3 className="font-display text-[clamp(24px,2.6vw,30px)] font-semibold leading-tight tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-3 text-[14.5px] leading-relaxed text-white/60">{description}</p>
      <span className="mt-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-white/80 transition-colors group-hover:text-accent">
        Open
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </span>
    </a>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-6 px-6 py-12 font-mono text-[11px] uppercase tracking-[0.18em] text-mute">
        <div className="flex items-center gap-3 text-ink">
          <BrandMark filled size={26} />
          <span className="font-display font-semibold tracking-tight text-ink">Innovatrix &apos;26</span>
          <span className="text-mute">/ A student-coordinator production</span>
        </div>
        <div className="flex items-center gap-6">
          <span>One day · Sixteen teams</span>
          <span className="text-line-2">/</span>
          <span>© 2026</span>
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
