'use client';

import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ClientOnly } from '@/components/ClientOnly';
import { PinKeypad } from '@/components/PinKeypad';
import { ToastProvider, useToast } from '@/components/Toast';
import { useEventPhase } from '@/lib/hooks';
import { PINS } from '@/lib/activities';
import { type Team } from '@/lib/teams';
import { SCHEDULE, type PhaseId, pad, formatCountdown } from '@/lib/schedule';
import { STORAGE_KEYS, readString, writeString, removeKey } from '@/lib/storage';
import {
  useAllTeams, usePhaseOverride, setSpotlight, useSpotlight,
  useAllScores, revealResultsNow, useResults, clearResults,
  useUpNext, setUpNext, useAllVoteTallies,
  usePreviewMode, resetAllEventData,
  usePauseMode,
  useTimer, setTimer,
  usePoll, setPoll,
  useSprint, setSprint, useSprintSubmissions,
} from '@/lib/data';
import { JUDGING_CRITERIA } from '@/lib/activities';

export default function ConsolePage() {
  return (
    <ToastProvider>
      <ConsoleShell />
    </ToastProvider>
  );
}

function ConsoleShell() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(readString(STORAGE_KEYS.coordAuth) === '1');
  }, []);

  if (authed === null) return null;

  if (!authed) {
    return (
      <PinKeypad
        role="Coordinator Access"
        roleTone="primary"
        title="Enter coordinator PIN"
        subtitle="Six digits. Only you and your co-coordinators should know it."
        correctPin={PINS.coordinator}
        onSuccess={() => {
          writeString(STORAGE_KEYS.coordAuth, '1');
          setAuthed(true);
        }}
        backHref="/"
      />
    );
  }

  return <Console onSignOut={() => { removeKey(STORAGE_KEYS.coordAuth); setAuthed(false); }} />;
}

function Console({ onSignOut }: { onSignOut: () => void }) {
  const { now, state, mounted } = useEventPhase();
  const { push: toast } = useToast();
  const teams = useAllTeams();
  const [override, setOverride] = usePhaseOverride();
  const [spotlight] = useSpotlight();
  const allScores = useAllScores();
  const [results] = useResults();
  const [upNext] = useUpNext();
  const voteTallies = useAllVoteTallies();
  const [previewMode, setPreviewMode] = usePreviewMode();
  const [paused, setPaused] = usePauseMode();
  const [resetting, setResetting] = useState(false);
  const [timer] = useTimer();
  const [poll] = usePoll();
  const [sprint] = useSprint();
  const sprintSubs = useSprintSubmissions();

  const setPhaseOverride = (id: PhaseId) => {
    if (!confirm(`Override phase to "${SCHEDULE.find((p) => p.id === id)?.label}"? This stays locked until you clear it.`)) return;
    setOverride(id);
    // Also keep the local-only key in sync so getPhaseState in lib/hooks reads it
    writeString(STORAGE_KEYS.phaseOverride, id);
    toast(`Phase overridden → ${id.toUpperCase()}`);
  };
  const clearOverride = () => {
    setOverride(null);
    removeKey(STORAGE_KEYS.phaseOverride);
    toast('Override cleared. Auto-advance resumed.');
  };

  const handleSpin = () => {
    if (teams.length < 3) { toast('Need at least 3 registered teams.'); return; }
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 3);
    setSpotlight({
      spinId: 'spin-' + Date.now().toString(36),
      teamIds: picked.map((t) => t.id),
      at: Date.now(),
    });
    toast('Spotlight triggered — every device just got it.');
  };

  const handleReveal = () => {
    const totalJudges = Object.keys(allScores).length;
    if (totalJudges === 0) {
      if (!confirm('No judges have submitted scores yet. Reveal anyway? (winner will be tied at 0.)')) return;
    } else if (!confirm(`Reveal results from ${totalJudges} ${totalJudges === 1 ? 'judge' : 'judges'}? This pushes confetti to every screen and cannot be undone.`)) {
      return;
    }
    revealResultsNow();
    toast('Results revealed.');
  };

  const handleClearReveal = () => {
    if (!confirm('Unreveal results? Confetti will stop and screens will go back to "tallying".')) return;
    clearResults();
    toast('Reveal cleared.');
  };

  // For the spotlight result display — resolve teamIds back to Team objects
  const spotlightTeams: Team[] = spotlight
    ? spotlight.teamIds.map((id) => teams.find((t) => t.id === id)).filter((t): t is Team => !!t)
    : [];

  const handleReset = async () => {
    const first = confirm(
      'Reset ALL event data?\n\nThis deletes:\n• Every registered team\n• Every judge score\n• Every audience vote\n• Every mentor ping\n• Every photo (file + metadata)\n• Spotlight, Up Next, Results, Phase override\n\nCannot be undone. Type-style confirm follows.',
    );
    if (!first) return;
    const second = prompt('Type "RESET" (all caps) to confirm:');
    if (second !== 'RESET') {
      toast('Reset cancelled.');
      return;
    }
    setResetting(true);
    try {
      const { kvRows, photos } = await resetAllEventData();
      toast(`Cleared ${kvRows} rows · ${photos} photos.`);
    } catch (e) {
      toast('Reset failed: ' + (e instanceof Error ? e.message : 'unknown'));
    } finally {
      setResetting(false);
    }
  };

  // Treat override the same as live — the whole point of override is to act
  // AS IF the phase is happening, so phase-gated actions must unlock there too.
  const phaseActive = state.status === 'live' || state.status === 'override';
  const inP2 = phaseActive && state.phase?.id === 'phase2';
  const inP3 = phaseActive && state.phase?.id === 'phase3';
  const inWrap = phaseActive && state.phase?.id === 'wrap';

  return (
    <div>
      <header className="sticky top-0 z-50 border-b border-line bg-bg/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-[880px] items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-2.5 font-display font-semibold tracking-tight">
            <BrandMark size={20} />
            <span>INNOVATRIX</span>
            <span className="rounded-full border border-primary/40 bg-primary/[0.10] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary-2">
              Console
            </span>
          </div>
          <button
            onClick={() => { if (confirm('Sign out of the coordinator console?')) onSignOut(); }}
            className="rounded-full border border-line bg-transparent px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-mute transition-colors hover:border-danger/40 hover:text-danger"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[880px] px-5 pb-20 pt-6">
        {/* Stats */}
        <div className="mb-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <ClientOnly fallback={<Stat label="Phase" figure="···" sub="···" />}>
            <Stat
              label="Phase"
              figure={state.status === 'pre' ? 'Pre-event' : state.status === 'post' ? 'Done' : state.phase?.short ?? '—'}
              figureClass={state.status === 'override' ? 'text-spark' : ''}
              sub={
                state.status === 'pre'
                  ? 'Starts in ' + formatCountdown(state.next!.start - now.getTime()).toUpperCase()
                  : state.status === 'live' || state.status === 'override'
                    ? (state.status === 'override' ? 'OVERRIDE · ' : '') + 'ENDS ' + formatCountdown(state.phase!.end - now.getTime()).toUpperCase()
                    : 'EVENT COMPLETE'
              }
            />
          </ClientOnly>
          <Stat label="Teams registered" figure={String(teams.length)} figureClass="text-accent" sub="OF 16 EXPECTED" />
          <ClientOnly fallback={<Stat label="Current time" figure="--:--" sub="···" />}>
            <Stat
              label="Current time"
              figure={`${pad(now.getHours())}:${pad(now.getMinutes())}`}
              sub={now.toLocaleDateString('en', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
            />
          </ClientOnly>
          <Stat label="Event day" figure="18 May" figureClass="text-[22px]" sub="10:00 → 16:00 IST" />
        </div>

        {/* Phase override */}
        <Section title="Phase override" badge="use only if running off-schedule">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {SCHEDULE.map((p) => {
              const liveId = override ?? state.phase?.id;
              const active = p.id === liveId;
              return (
                <button
                  key={p.id}
                  onClick={() => setPhaseOverride(p.id)}
                  className={`rounded-xl border px-2.5 py-3.5 text-center transition-all ${
                    active ? 'border-primary bg-primary/[0.10] text-primary' : 'border-line bg-surface-2 text-ink-2 hover:border-line-2 hover:bg-white'
                  }`}
                >
                  <div className="font-display text-sm font-semibold">{p.label.split('·')[0].trim()}</div>
                  <div className={`mt-0.5 font-mono text-[10px] tracking-wider ${active ? 'text-primary-2' : 'text-mute'}`}>
                    {p.short}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-mute">
            By default the phase auto-advances from the live clock. Clicking a phase here <b className="text-accent">locks an override</b> until you clear it.
          </p>
          {override && (
            <button
              onClick={clearOverride}
              className="mt-3.5 w-full rounded-2xl border border-line-2 bg-transparent px-5 py-4 text-[15px] font-medium text-ink-2 transition-colors hover:border-primary hover:bg-surface-2 hover:text-ink"
            >
              Clear override → resume auto-advance
            </button>
          )}
        </Section>

        {/* Spotlight Wheel */}
        <Section title="Phase 2 · Spotlight Wheel" badge="runs in Phase 2 only">
          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
            Press at <b className="text-accent">~1:00 PM</b>. Picks 3 random teams from the registered list. The wheel animates on every phone + the projector simultaneously. Each pick gets 90 seconds on stage.
          </p>
          <button
            onClick={handleSpin}
            disabled={!inP2}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-[15px] font-semibold text-white shadow-glow transition-all hover:-translate-y-px hover:bg-primary-2 hover:shadow-glow-lg disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute disabled:shadow-none"
          >
            {inP2 ? 'Spin the wheel' : 'Available in Phase 2 (Build & Interact)'}
          </button>
          {spotlight && spotlightTeams.length > 0 && (
            <div className="mt-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-accent">
                  Spotlight teams · live on every device
                </div>
                <button
                  onClick={() => setSpotlight(null)}
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute hover:text-danger"
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {spotlightTeams.map((t) => (
                  <div key={t.id} className="rounded-xl border border-line-2 bg-surface-2 p-3.5">
                    <div className="mb-2.5 h-1 rounded" style={{ background: t.color }} />
                    <div className="font-display text-sm font-semibold">{t.name}</div>
                    <div className="mt-1 line-clamp-2 text-[11px] text-mute">{t.idea}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Up Next — Phase 3 queue control */}
        <Section title="Phase 3 · Up Next" badge="live queue control">
          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
            Tap a team to mark them as currently presenting. Updates every participant phone + the projector + auto-focuses judges. 16 teams × 7 min ≈ 112 minutes for the full round.
          </p>
          {teams.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-surface-2 p-6 text-center text-[13px] text-mute">
              No teams registered yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {teams.map((t) => {
                const active = upNext?.teamId === t.id;
                const tally = voteTallies[t.id] ?? { wow: 0, cool: 0, fine: 0 };
                const totalVotes = tally.wow + tally.cool + tally.fine;
                return (
                  <button
                    key={t.id}
                    onClick={() => setUpNext(active ? null : { teamId: t.id, startedAt: Date.now() })}
                    className={`relative overflow-hidden rounded-xl border p-3 text-left transition-all ${
                      active
                        ? 'border-accent bg-accent/[0.10]'
                        : 'border-line bg-surface-2 hover:border-line-2'
                    }`}
                  >
                    <div className="mb-2 h-1 rounded" style={{ background: t.color }} />
                    <div className="font-display text-[13px] font-semibold leading-tight">{t.name}</div>
                    {active && (
                      <span className="absolute right-2 top-2 rounded-full bg-accent px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] text-white">
                        LIVE
                      </span>
                    )}
                    {totalVotes > 0 && (
                      <div className="mt-2 flex gap-1.5 font-mono text-[9.5px] text-mute">
                        <span title="Wow">🤩 {tally.wow}</span>
                        <span title="Cool">🙂 {tally.cool}</span>
                        <span title="Fine">😐 {tally.fine}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {upNext && (
            <button
              onClick={() => setUpNext(null)}
              className="mt-3.5 w-full rounded-2xl border border-line-2 bg-transparent px-5 py-3 text-[14px] font-medium text-ink-2 transition-colors hover:border-spark hover:text-spark"
            >
              Clear &quot;Up Next&quot; → between teams
            </button>
          )}
        </Section>

        {/* Presentation Timer */}
        <TimerControls timer={timer} />

        {/* Live Word Cloud Poll */}
        <PollControls poll={poll} />

        {/* Speed Idea Sprint */}
        <SprintControls sprint={sprint} sprintSubs={sprintSubs} teamCount={teams.length} />

        <Section title="Final reveal" badge="end-of-event only" badgeClass="text-spark" borderClass="border-spark/30">
          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
            Pressing this aggregates all judge scores, ranks the teams, and triggers the final reveal — confetti + winner announcement on every phone + the projector.
            {results?.revealed ? (
              <> <b className="text-accent">Currently revealed.</b></>
            ) : (
              <> <b className="text-spark">Pushes to every screen.</b></>
            )}
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              onClick={handleReveal}
              disabled={results?.revealed === true}
              className="w-full rounded-2xl bg-spark px-5 py-4 text-[15px] font-semibold text-white shadow-[0_6px_24px_-10px_rgba(245,158,11,0.45)] transition-all hover:-translate-y-px hover:bg-[#FBBF24] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute disabled:shadow-none"
            >
              {results?.revealed ? '✓ Results revealed' : 'Reveal results'}
            </button>
            {results?.revealed && (
              <button
                onClick={handleClearReveal}
                className="w-full rounded-2xl border border-line-2 bg-transparent px-5 py-4 text-[15px] font-medium text-ink-2 transition-colors hover:border-primary hover:text-ink"
              >
                Unreveal (clear confetti)
              </button>
            )}
          </div>
          {(() => {
            const judgeCount = Object.keys(allScores).length;
            return (
              <div className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">
                {judgeCount === 0 ? 'No scores yet.' : `${judgeCount} ${judgeCount === 1 ? 'judge has' : 'judges have'} submitted scores.`}
              </div>
            );
          })()}
        </Section>

        {/* Preview mode — testing helper */}
        <Section title="Preview mode" badge="for testing — turn OFF before event">
          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
            When <b>ON</b>, every activity unlocks on every device — Idea Cards, Bingo, Pitch Lab, Photo Booth, Audience Vote, all of it — regardless of the current phase. Use this to play through every activity with your co-coordinators before event day.
            <br /><br />
            <b className="text-spark">Turn OFF an hour before the event starts</b> so participants only see what's appropriate for the current phase.
          </p>
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`w-full rounded-2xl px-5 py-4 text-[15px] font-semibold transition-all ${
              previewMode
                ? 'border border-accent bg-accent text-white shadow-glow-cyan hover:bg-accent-2'
                : 'border border-line-2 bg-transparent text-ink-2 hover:border-accent hover:bg-surface-2 hover:text-ink'
            }`}
          >
            {previewMode ? '✓ Preview mode is ON · tap to turn OFF' : 'Turn ON preview mode'}
          </button>
        </Section>

        {/* Pause the room — sudden-stop */}
        <Section title="Pause the room" badge="freeze all participant devices" badgeClass="text-spark">
          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
            When <b>ON</b>, every participant device shows a full-screen <b className="text-spark">Paused by coordinator</b> banner that blocks new submissions, votes, photos, and sprint answers. Existing state is preserved — flip OFF and everyone resumes exactly where they were.
            <br /><br />
            Use it for announcements, technical timeouts, or anything that needs the room&apos;s attention.
          </p>
          <button
            onClick={() => setPaused(!paused)}
            className={`w-full rounded-2xl px-5 py-4 text-[15px] font-semibold transition-all ${
              paused
                ? 'border border-spark bg-spark text-white shadow-[0_6px_24px_-10px_rgba(245,158,11,0.45)] hover:bg-[#FBBF24]'
                : 'border border-line-2 bg-transparent text-ink-2 hover:border-spark hover:bg-surface-2 hover:text-ink'
            }`}
          >
            {paused ? '⏸ Room is PAUSED · tap to resume' : 'Pause the room'}
          </button>
        </Section>

        {/* Reset all event data */}
        <Section title="Reset event data" badge="for the morning of 18 May" badgeClass="text-danger" borderClass="border-danger/30">
          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
            Wipes <b className="text-danger">everything</b>: all teams, scores, votes, pings, photos, spotlight, results, phase override. <b>Cannot be undone.</b> Run this once before the real event so you start fresh.
          </p>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="w-full rounded-2xl bg-danger px-5 py-4 text-[15px] font-semibold text-white shadow-[0_6px_24px_-10px_rgba(239,68,68,0.45)] transition-all hover:-translate-y-px hover:bg-[#DC2626] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute"
          >
            {resetting ? 'Resetting…' : 'Reset all event data'}
          </button>
        </Section>

        {/* Team list */}
        <Section title="Registered teams" badge={`${teams.length} / 16`}>
          {teams.length === 0 ? (
            <div className="py-10 text-center font-mono text-[13px] leading-relaxed tracking-wide text-mute">
              No teams yet. Once participants register from <code className="font-mono text-[11px] text-accent">/</code> they&apos;ll appear here in real time.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((t) => (
                <div key={t.id} className="rounded-2xl border border-line bg-surface-2 p-3.5 transition-colors hover:border-line-2">
                  <div className="mb-2.5 h-1 rounded" style={{ background: t.color }} />
                  <h4 className="font-display text-[15px] font-semibold leading-tight">{t.name}</h4>
                  <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-ink-2">{t.idea}</p>
                  <div className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-mute">
                    {t.members.length} {t.members.length === 1 ? 'MEMBER' : 'MEMBERS'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </main>
    </div>
  );
}

function Stat({
  label, figure, sub, figureClass = '', suppressHydration = false,
}: { label: string; figure: string; sub?: string; figureClass?: string; suppressHydration?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-mute">{label}</div>
      <div suppressHydrationWarning={suppressHydration} className={`font-display text-[26px] font-semibold leading-none tracking-tight ${figureClass}`}>
        {figure}
      </div>
      {sub && <div suppressHydrationWarning={suppressHydration} className="mt-1 font-mono text-[10px] tracking-wider text-mute">{sub}</div>}
    </div>
  );
}

function Section({
  title, badge, badgeClass = '', borderClass = 'border-line', children,
}: {
  title: string;
  badge?: string;
  badgeClass?: string;
  borderClass?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`mb-4 rounded-2xl border bg-surface p-[22px] ${borderClass}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-[17px] font-semibold tracking-tight">{title}</h3>
        {badge && (
          <span className={`font-mono text-[9.5px] uppercase tracking-[0.16em] ${badgeClass || 'text-mute'}`}>{badge}</span>
        )}
      </div>
      {children}
    </section>
  );
}

// ─── Timer controls ─────────────────────────────────────────────────────────
function TimerControls({ timer }: { timer: ReturnType<typeof useTimer>[0] }) {
  const [minutes, setMinutes] = useState<number>(5);
  const [label, setLabel] = useState<string>('Pitch');
  const isRunning = !!timer && timer.startedAt != null;
  const isPaused = !!timer && timer.startedAt == null;

  const start = () => {
    const ms = Math.max(10_000, minutes * 60_000);
    setTimer({ startedAt: Date.now(), durationMs: ms, remainingMs: ms, label });
  };
  const pause = () => {
    if (!timer || timer.startedAt == null) return;
    const elapsed = Date.now() - timer.startedAt;
    const remaining = Math.max(0, timer.remainingMs - elapsed);
    setTimer({ ...timer, startedAt: null, remainingMs: remaining });
  };
  const resume = () => {
    if (!timer || timer.startedAt != null) return;
    setTimer({ ...timer, startedAt: Date.now() });
  };
  const stop = () => setTimer(null);

  return (
    <Section title="Presentation Timer" badge="shows on the projector">
      <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
        Counts down a configurable timer with a beep at <b className="text-spark">30 seconds</b> remaining. Use during Phase 3 pitches to keep teams on schedule.
      </p>
      {!timer ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-mute">Minutes</label>
              <input
                type="number" min={1} max={30} value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-[15px] text-ink outline-none focus:border-primary"
              />
            </div>
            <div className="flex-[2]">
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-mute">Label</label>
              <input
                type="text" value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Pitch / Q&A"
                className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-[15px] text-ink outline-none focus:border-primary"
              />
            </div>
          </div>
          <button
            onClick={start}
            className="w-full rounded-2xl bg-primary px-5 py-3.5 text-[15px] font-semibold text-white shadow-glow transition-all hover:-translate-y-px hover:bg-primary-2 hover:shadow-glow-lg"
          >
            Start timer
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent">
            {isRunning ? 'Running' : 'Paused'} · {timer.label || 'Timer'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {isRunning ? (
              <button onClick={pause} className="rounded-xl border border-line-2 bg-surface-2 px-4 py-3 text-[14px] font-medium hover:border-primary">Pause</button>
            ) : (
              <button onClick={resume} className="rounded-xl border border-line-2 bg-surface-2 px-4 py-3 text-[14px] font-medium hover:border-primary">Resume</button>
            )}
            <button onClick={stop} className="rounded-xl border border-line-2 bg-transparent px-4 py-3 text-[14px] font-medium text-ink-2 hover:border-danger hover:text-danger">Stop & hide</button>
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Poll controls ──────────────────────────────────────────────────────────
function PollControls({ poll }: { poll: ReturnType<typeof usePoll>[0] }) {
  const [question, setQuestion] = useState<string>('In one word: what does innovation mean to you?');
  const start = () => {
    const q = question.trim();
    if (q.length < 4) return;
    setPoll({ id: 'poll-' + Date.now().toString(36), question: q, startedAt: Date.now() });
  };
  const stop = () => setPoll(null);

  return (
    <Section title="Live Word Cloud Poll" badge="instant cloud on the projector">
      <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
        Pushes a question to every device. Participants submit one word each, and the projector grows a word cloud in real time. Great for warm-ups, transitions, or post-keynote moments.
      </p>
      {!poll ? (
        <div className="space-y-3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={120}
            className="min-h-[64px] w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-3 text-[15px] text-ink outline-none focus:border-accent"
          />
          <button
            onClick={start}
            disabled={question.trim().length < 4}
            className="w-full rounded-2xl bg-accent px-5 py-3.5 text-[15px] font-semibold text-white shadow-glow-cyan transition-all hover:-translate-y-px hover:bg-accent-2 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute"
          >
            Start poll
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="rounded-xl border border-accent/40 bg-accent/[0.06] px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">Live</div>
            <div className="mt-1 font-display text-[15px] font-medium">{poll.question}</div>
          </div>
          <button onClick={stop} className="w-full rounded-2xl border border-line-2 bg-transparent px-4 py-3 text-[14px] font-medium text-ink-2 hover:border-danger hover:text-danger">
            End poll
          </button>
        </div>
      )}
    </Section>
  );
}

// ─── Sprint controls ────────────────────────────────────────────────────────
function SprintControls({
  sprint, sprintSubs, teamCount,
}: {
  sprint: ReturnType<typeof useSprint>[0];
  sprintSubs: ReturnType<typeof useSprintSubmissions>;
  teamCount: number;
}) {
  const [prompt, setPrompt] = useState<string>('Pitch a startup that uses your hostel mess in some way.');
  const [minutes, setMinutes] = useState<number>(4);
  const isActive = !!sprint;
  const remaining = sprint ? Math.max(0, sprint.endsAt - Date.now()) : 0;

  const start = () => {
    const p = prompt.trim();
    if (p.length < 6) return;
    const now = Date.now();
    const durationMs = Math.max(60_000, minutes * 60_000);
    setSprint({
      id: 'sprint-' + Date.now().toString(36),
      prompt: p,
      durationMs,
      startedAt: now,
      endsAt: now + durationMs,
    });
  };
  const stop = () => setSprint(null);
  const pickWinner = (teamId: string) => {
    if (!sprint) return;
    const next = sprint.winners ?? [];
    const updated = next.includes(teamId) ? next.filter((id) => id !== teamId) : [...next, teamId];
    setSprint({ ...sprint, winners: updated });
  };

  return (
    <Section title="Speed Idea Sprint" badge="all-teams competition · ~4 min">
      <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
        Drops a prompt to every team. Each team has the timer to submit a one-line idea. After time, the projector shows every submission gridded out — tap a team here to mark them as a winner (their card glows lime).
      </p>
      {!isActive ? (
        <div className="space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={200}
            placeholder="The prompt every team will see…"
            className="min-h-[80px] w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-3 text-[15px] text-ink outline-none focus:border-spark"
          />
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-mute">Duration (minutes)</label>
            <input
              type="number" min={1} max={15} value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value, 10) || 4)}
              className="w-32 rounded-xl border border-line bg-surface-2 px-4 py-3 text-[15px] text-ink outline-none focus:border-spark"
            />
          </div>
          <button
            onClick={start}
            disabled={prompt.trim().length < 6}
            className="w-full rounded-2xl bg-spark px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_6px_24px_-10px_rgba(245,158,11,0.45)] transition-all hover:-translate-y-px hover:bg-[#FBBF24] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute"
          >
            Start sprint
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-spark/40 bg-spark/[0.06] px-4 py-3">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-spark">
              <span>{remaining > 0 ? 'Composing' : 'Closed · pick winners'}</span>
              <span>{sprintSubs.length} / {teamCount || 16} submitted</span>
            </div>
            <div className="mt-1 font-display text-[15px] font-medium">{sprint.prompt}</div>
          </div>

          {sprintSubs.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {sprintSubs.map((s) => {
                const isWinner = sprint.winners?.includes(s.teamId);
                return (
                  <button
                    key={s.teamId}
                    onClick={() => pickWinner(s.teamId)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      isWinner ? 'border-accent bg-accent/[0.10]' : 'border-line bg-surface-2 hover:border-line-2'
                    }`}
                    style={{ borderLeftColor: s.teamColor, borderLeftWidth: 4 }}
                  >
                    <div className="mb-1 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.16em] text-mute">
                      <span style={{ color: s.teamColor }}>{s.teamName}</span>
                      {isWinner && <span className="text-accent">★</span>}
                    </div>
                    <div className="text-[13px] leading-snug text-ink">{s.text}</div>
                  </button>
                );
              })}
            </div>
          )}

          <button onClick={stop} className="w-full rounded-2xl border border-line-2 bg-transparent px-4 py-3 text-[14px] font-medium text-ink-2 hover:border-danger hover:text-danger">
            End sprint &amp; hide
          </button>
        </div>
      )}
    </Section>
  );
}
