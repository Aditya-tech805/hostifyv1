'use client';

import { useEffect, useRef, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ClientOnly } from '@/components/ClientOnly';
import { AwardsConsole } from '@/components/awards/AwardsConsole';
import { PinKeypad } from '@/components/PinKeypad';
import { ToastProvider, useToast } from '@/components/Toast';
import { useEventPhase } from '@/lib/hooks';
import { type Team } from '@/lib/teams';
import { SCHEDULE, type PhaseId, pad, formatCountdown } from '@/lib/schedule';
import { STORAGE_KEYS, readString, writeString, removeKey } from '@/lib/storage';
import { readAppToken, writeAppToken, clearAppToken } from '@/lib/auth-client';
import {
  useAllTeams, usePhaseOverride, setSpotlight, useSpotlight,
  useAllScores, revealResultsNow, useResults, clearResults,
  useUpNext, setUpNext, useAllVoteTallies,
  usePreviewMode, resetAllEventData,
  usePauseMode,
  useTimer, setTimer,
  usePoll, setPoll,
  useSprint, setSprint, useSprintSubmissions,
  usePanel, writePanelMember, removePanelMember, type PanelMember,
  useMessage, writeMessage, type MessageSlot, type ScreenMessage,
  useSeniors, writeSenior, removeSenior, type Senior,
  useAllPresentations, removePresentation, type Presentation,
  uploadAvatar, removeAvatar, type AvatarKind,
} from '@/lib/data';
import { JUDGING_CRITERIA } from '@/lib/activities';
import { EVENT, PLATFORM, EVENT_DATE_SHORT, DOORS_TIME, WRAP_TIME } from '@/config/event';

export default function ConsolePage() {
  return (
    <ToastProvider>
      <ConsoleShell />
    </ToastProvider>
  );
}

function ConsoleShell() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Auth is now bound to a server-issued JWT, not a localStorage flag.
  // A stale `coordAuth=1` left over from the old client-only flow is
  // ignored — we re-check the JWT presence + expiry on every mount.
  useEffect(() => {
    const t = readAppToken();
    setAuthed(t?.app_role === 'coordinator');
  }, []);

  if (authed === null) return null;

  if (!authed) {
    return (
      <PinKeypad
        role="Coordinator Access"
        roleTone="primary"
        title="Enter coordinator PIN"
        subtitle="Six digits. Verified server-side. Only you and your co-coordinators should know it."
        onSubmitPin={async (pin) => {
          const res = await fetch('/api/auth/coordinator', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ pin }),
          });
          if (res.status === 401) return false; // wrong PIN — keypad shows shake
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.error || 'Auth failed.');
          }
          const data = (await res.json()) as { token: string; exp: number };
          writeAppToken({ token: data.token, exp: data.exp, app_role: 'coordinator' });
          // Hard reload so the Supabase client picks up the new bearer token
          // on its next instantiation — clean, no stale subscriptions.
          window.location.reload();
          return true;
        }}
        backHref="/"
      />
    );
  }

  return (
    <Console
      onSignOut={() => {
        clearAppToken();
        removeKey(STORAGE_KEYS.coordAuth); // legacy flag cleanup
        setAuthed(false);
        window.location.reload();
      }}
    />
  );
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
            <span>{EVENT.wordmark}</span>
            <span className="rounded-full border border-primary/40 bg-primary/[0.10] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary-2">
              {PLATFORM.name} console
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
          <Stat label="Teams registered" figure={String(teams.length)} figureClass="text-accent" sub={`OF ${EVENT.expectedTeams} EXPECTED`} />
          <ClientOnly fallback={<Stat label="Current time" figure="--:--" sub="···" />}>
            <Stat
              label="Current time"
              figure={`${pad(now.getHours())}:${pad(now.getMinutes())}`}
              sub={now.toLocaleDateString('en', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
            />
          </ClientOnly>
          <Stat label="Event day" figure={EVENT_DATE_SHORT} figureClass="text-[22px]" sub={`${DOORS_TIME} → ${WRAP_TIME} ${EVENT.tzLabel}`} />
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
                    active ? 'border-primary bg-primary/[0.10] text-primary' : 'border-line bg-surface-2 text-ink-2 hover:border-line-2 hover:bg-surface-2'
                  }`}
                >
                  <div className="font-display text-sm font-semibold leading-tight">{p.short}</div>
                  <div className={`mt-0.5 font-mono text-[9.5px] tracking-[0.14em] ${active ? 'text-primary-2' : 'text-mute'}`}>
                    {p.label.split('·')[0].trim().toUpperCase()}
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

        {/* Spotlight Wheel - explicit start / stop toggle so it's never
            "stuck" on the projector after a test run. The same big button
            triggers a spin when nothing is active, and stops the spotlight
            (clearing the overlay from every device) when one is running. */}
        <Section
          title="Phase 2 · Spotlight Wheel"
          badge={spotlight ? 'LIVE on every screen' : 'runs in Phase 2 only'}
          badgeClass={spotlight ? 'text-spark' : ''}
          borderClass={spotlight ? 'border-spark/40' : 'border-line'}
        >
          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
            Picks 3 random teams from the registered list. The wheel animates on every phone and on the projector simultaneously. Each pick gets 90 seconds on stage.
            <br /><br />
            When you&apos;re done, <b className="text-spark">stop it</b> &mdash; the same big button below toggles. Otherwise the reveal stays visible on every device.
          </p>
          {spotlight ? (
            <button
              onClick={() => setSpotlight(null)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-spark px-5 py-4 text-[15px] font-semibold text-white shadow-[0_6px_24px_-10px_rgba(245,158,11,0.45)] transition-all hover:-translate-y-px hover:bg-[#FBBF24]"
            >
              ◼ Stop spotlight &middot; clear from all screens
            </button>
          ) : (
            <button
              onClick={handleSpin}
              disabled={!inP2}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-[15px] font-semibold text-white shadow-glow transition-all hover:-translate-y-px hover:bg-primary-2 hover:shadow-glow-lg disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute disabled:shadow-none"
            >
              {inP2 ? '▶ Spin the wheel' : 'Available in Phase 2 (Idea Development)'}
            </button>
          )}
          {spotlight && spotlightTeams.length > 0 && (
            <div className="mt-4">
              <div className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-spark">
                Currently showing on every device
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
            Tap a team to mark them as currently presenting. Updates every participant phone + the projector + auto-focuses judges. {EVENT.expectedTeams} teams × 5 min ≈ {EVENT.expectedTeams * 5} minutes for the full round.
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

        {/* Team presentations — coordinator pulls these up during judging */}
        <PresentationsSection teams={teams} upNextTeamId={upNext?.teamId ?? null} />

        {/* Presentation Timer */}
        <TimerControls timer={timer} />

        {/* Live Word Cloud Poll */}
        <PollControls poll={poll} />

        {/* Speed Idea Sprint */}
        <SprintControls sprint={sprint} sprintSubs={sprintSubs} teamCount={teams.length} />

        <PanelManager />

        <SeniorsManager />

        <MessagesManager />

        <Section title="Quick reveal" badge="auto-ranked from judge scores" badgeClass="text-spark" borderClass="border-spark/30">
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

        {/* Awards ceremony — staged podium reveal driven by final rankings */}
        <div className="mb-4">
          <AwardsConsole teams={teams} />
        </div>

        {/* Preview mode — testing helper */}
        <Section title="Preview mode" badge="for testing — turn OFF before event">
          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
            When <b>ON</b>, every activity unlocks on every device — Bingo, Team Wall, Connect, Photo Booth, Audience Vote, all of it — regardless of the current phase. Use this to play through every activity with your co-coordinators before event day.
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
        <Section title="Reset event data" badge="run before doors open" badgeClass="text-danger" borderClass="border-danger/30">
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
        <Section title="Registered teams" badge={`${teams.length} / ${EVENT.expectedTeams}`}>
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

// ─── Reusable avatar slot (photo + upload trigger + clear) ────────────────
// Used by both PanelManager (judges) and SeniorsManager (connect list). Shows the
// uploaded photo if present, otherwise an initials circle. Clicking the
// slot opens a file picker. A small × in the corner clears the photo
// back to initials (without deleting the panel/connect record).

function AvatarSlot({
  kind, id, color, photoUrl, fallback, onUploaded, onCleared,
}: {
  kind: AvatarKind;
  id: string;
  color: string;
  photoUrl?: string;
  fallback: string;
  onUploaded: (publicUrl: string) => void;
  onCleared: () => void;
}) {
  const { push: toast } = useToast();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onPick = () => { if (!busy) inputRef.current?.click(); };

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || busy) return;
    setBusy(true);
    try {
      const url = await uploadAvatar(kind, id, file);
      onUploaded(url);
      toast('Photo uploaded.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const onClear = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    if (!confirm('Remove this photo? It will go back to initials.')) return;
    setBusy(true);
    try {
      await removeAvatar(kind, id);
      onCleared();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={onPick}
        disabled={busy}
        title={photoUrl ? 'Replace photo' : 'Upload photo'}
        aria-label={photoUrl ? 'Replace photo' : 'Upload photo'}
        className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full font-display text-[12px] font-bold text-bg ring-2 ring-transparent transition-all hover:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: color }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{fallback}</span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-bg/70 text-[10px] font-mono text-ink">…</span>
        )}
      </button>
      {photoUrl && !busy && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove photo"
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-line bg-bg text-[10px] leading-none text-mute hover:border-danger/60 hover:text-danger"
        >
          ×
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onChange={onChange}
        className="hidden"
      />
    </div>
  );
}

// ─── Judges panel manager ──────────────────────────────────────────────────
// Curates the jury list shown on the participant landing. Coordinator-only.
const PANEL_COLORS = ['#6366F1', '#A78BFA', '#22D3EE', '#FBBF24', '#F87171', '#84CC16', '#F97316', '#0EA5E9'];

function panelInitials(name: string): string {
  const cleaned = name.replace(/[\[\]().]/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function PanelManager() {
  const panel = usePanel();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const canAdd = name.trim().length >= 2 && role.trim().length >= 2;

  const add = () => {
    if (!canAdd) return;
    const color = PANEL_COLORS[panel.length % PANEL_COLORS.length];
    const member: PanelMember = {
      id: 'judge-' + (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10)),
      name: name.trim(),
      role: role.trim(),
      color,
      addedAt: Date.now(),
    };
    writePanelMember(member);
    setName('');
    setRole('');
  };

  return (
    <Section title="Judges panel" badge="shown on the landing — all teams see this">
      <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
        Add the panel members here. Each card appears on the participant landing under
        <b className="text-accent"> &ldquo;Who&apos;s keeping score.&rdquo;</b> Order is by add-time.
        Names can be added or removed anytime — changes sync live to every device.
      </p>

      {panel.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-2 bg-surface-2 p-5 text-center text-[13px] text-mute">
          No panel members yet — the landing shows a &ldquo;finalising&rdquo; placeholder.
        </div>
      ) : (
        <div className="space-y-1.5">
          {panel.map((j) => (
            <div key={j.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-2.5">
              <AvatarSlot
                kind="panel"
                id={j.id}
                color={j.color}
                photoUrl={j.photoUrl}
                fallback={panelInitials(j.name)}
                onUploaded={(url) => writePanelMember({ ...j, photoUrl: url })}
                onCleared={() => writePanelMember({ ...j, photoUrl: undefined })}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[14px] font-semibold leading-tight tracking-tight text-ink">
                  {j.name}
                </div>
                <div className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                  {j.role}
                </div>
              </div>
              <button
                onClick={() => {
                  if (!confirm(`Remove ${j.name} from the panel?`)) return;
                  // Also delete the avatar file, otherwise it lingers in
                  // storage with no record pointing at it.
                  void removeAvatar('panel', j.id);
                  removePanelMember(j.id);
                }}
                aria-label="Remove"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-bg text-mute transition-colors hover:border-danger/40 hover:text-danger"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          type="text"
          maxLength={48}
          placeholder="Name (e.g. Rajat Singh)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canAdd) add(); }}
          className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary focus:bg-surface-3"
        />
        <input
          type="text"
          maxLength={48}
          placeholder="Role (e.g. Senior PM · Industry)"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canAdd) add(); }}
          className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary focus:bg-surface-3"
        />
        <button
          onClick={add}
          disabled={!canAdd}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-px hover:bg-primary-2 hover:shadow-glow-lg disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute disabled:shadow-none"
        >
          Add judge
        </button>
      </div>
    </Section>
  );
}

// ─── Connect list manager (LinkedIn-connect curator) ───────────────────────
// Coordinator curates the list shown on /activities/connect. Each entry
// has a name, a role (free-form), and a LinkedIn URL. Order is add-time
// to keep the on-screen list deterministic.
const SENIOR_COLORS = ['#0A66C2', '#6366F1', '#A78BFA', '#22D3EE', '#FBBF24', '#84CC16', '#F97316', '#F87171'];

function SeniorsManager() {
  const seniors = useSeniors();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [url, setUrl] = useState('');

  const trimmedUrl = url.trim();
  const looksLikeUrl = /^https?:\/\/(www\.)?linkedin\.com\//i.test(trimmedUrl) || /^https?:\/\/(www\.)?lnkd\.in\//i.test(trimmedUrl);
  const canAdd = name.trim().length >= 2 && role.trim().length >= 2 && looksLikeUrl;

  const add = () => {
    if (!canAdd) return;
    const color = SENIOR_COLORS[seniors.length % SENIOR_COLORS.length];
    const member: Senior = {
      id: 'senior-' + (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10)),
      name: name.trim(),
      role: role.trim(),
      linkedinUrl: trimmedUrl,
      color,
      addedAt: Date.now(),
    };
    writeSenior(member);
    setName('');
    setRole('');
    setUrl('');
  };

  return (
    <Section title="Connect list" badge="people to connect with — /activities/connect">
      <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
        Mentors, alumni and guests the participants can reach out to on LinkedIn. Each card opens the URL in a new tab.
        URLs must start with <code className="font-mono text-[12px] text-accent">https://linkedin.com/...</code>.
      </p>

      {seniors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-2 bg-surface-2 p-5 text-center text-[13px] text-mute">
          No one on the list yet — the activity shows a &ldquo;finalising&rdquo; placeholder.
        </div>
      ) : (
        <div className="space-y-1.5">
          {seniors.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-2.5">
              <AvatarSlot
                kind="senior"
                id={s.id}
                color={s.color}
                photoUrl={s.photoUrl}
                fallback={seniorInitials(s.name)}
                onUploaded={(url) => writeSenior({ ...s, photoUrl: url })}
                onCleared={() => writeSenior({ ...s, photoUrl: undefined })}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[14px] font-semibold leading-tight tracking-tight text-ink">
                  {s.name}
                </div>
                <div className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                  {s.role}
                </div>
                <a
                  href={s.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-block truncate font-mono text-[10px] text-accent hover:underline"
                  style={{ maxWidth: '260px' }}
                >
                  {s.linkedinUrl}
                </a>
              </div>
              <button
                onClick={() => {
                  if (!confirm(`Remove ${s.name} from the connect list?`)) return;
                  void removeAvatar('senior', s.id);
                  removeSenior(s.id);
                }}
                aria-label={`Remove ${s.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-bg text-mute transition-colors hover:border-danger/40 hover:text-danger"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="text"
          maxLength={48}
          placeholder="Name (e.g. Aanya Sharma)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary focus:bg-surface-3"
        />
        <input
          type="text"
          maxLength={64}
          placeholder="Role (e.g. Engineer · Northwind)"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary focus:bg-surface-3"
        />
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="url"
          maxLength={256}
          placeholder="https://linkedin.com/in/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canAdd) add(); }}
          className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary focus:bg-surface-3"
        />
        <button
          onClick={add}
          disabled={!canAdd}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-px hover:bg-primary-2 hover:shadow-glow-lg disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute disabled:shadow-none"
        >
          Add person
        </button>
      </div>
      {url.length > 0 && !looksLikeUrl && (
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-spark">
          URL must start with https://linkedin.com/ or https://lnkd.in/
        </div>
      )}
    </Section>
  );
}

function seniorInitials(name: string): string {
  const parts = name.replace(/[\[\]().]/g, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Team presentations (PPT/PDF) — coordinator's go-to during judging ─────
// Lists every team with their uploaded presentation. The team currently
// "Up Next" sits at the top of the list and is highlighted. Coordinator
// clicks Open to launch the file in a new tab so they can present from
// their own laptop while the team explains the idea on stage.

function PresentationsSection({
  teams,
  upNextTeamId,
}: {
  teams: ReturnType<typeof useAllTeams>;
  upNextTeamId: string | null;
}) {
  const presentations = useAllPresentations();
  const uploadedCount = Object.keys(presentations).length;

  // Sort: Up Next first, then teams with uploads (most recent first),
  // then teams without uploads alphabetically.
  const ordered = [...teams].sort((a, b) => {
    if (a.id === upNextTeamId) return -1;
    if (b.id === upNextTeamId) return 1;
    const aHas = !!presentations[a.id];
    const bHas = !!presentations[b.id];
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    if (aHas && bHas) return presentations[b.id].uploadedAt - presentations[a.id].uploadedAt;
    return a.name.localeCompare(b.name);
  });

  return (
    <Section
      title="Team presentations"
      badge={`${uploadedCount} / ${teams.length} uploaded`}
    >
      <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
        Every team uploads their PPT / PDF from their dashboard. When a team is on stage, click <b className="text-accent">Open</b> on their row to launch
        the file in a new tab &mdash; you drive the slides on the projector while they explain the idea to the panel. The team marked
        <b className="text-spark"> Up Next</b> floats to the top.
      </p>

      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-2 bg-surface-2 p-5 text-center text-[13px] text-mute">
          No teams registered yet.
        </div>
      ) : (
        <div className="space-y-2">
          {ordered.map((t) => (
            <PresentationRow
              key={t.id}
              team={t}
              presentation={presentations[t.id] ?? null}
              isUpNext={t.id === upNextTeamId}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

function PresentationRow({
  team, presentation, isUpNext,
}: {
  team: { id: string; name: string; color: string };
  presentation: Presentation | null;
  isUpNext: boolean;
}) {
  const sizeMb = presentation ? (presentation.sizeBytes / 1024 / 1024).toFixed(1) : null;
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
        isUpNext
          ? 'border-spark/60 bg-spark/[0.06]'
          : presentation
            ? 'border-line bg-surface-2'
            : 'border-dashed border-line-2 bg-surface-2/50'
      }`}
    >
      <div className="h-10 w-1.5 shrink-0 rounded" style={{ background: team.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate font-display text-[14px] font-semibold leading-tight tracking-tight text-ink">
            {team.name}
          </div>
          {isUpNext && (
            <span className="shrink-0 rounded-full bg-spark px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white">
              Up next
            </span>
          )}
        </div>
        {presentation ? (
          <div className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
            {presentation.filename} &middot; {sizeMb} MB
          </div>
        ) : (
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
            Not uploaded yet
          </div>
        )}
      </div>
      {presentation && (
        <>
          <a
            href={presentation.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg bg-accent px-3.5 py-2 font-display text-[12.5px] font-semibold text-bg shadow-glow-cyan transition-all hover:-translate-y-px hover:bg-accent-2"
          >
            Open
          </a>
          <button
            onClick={() => {
              if (!confirm(`Remove ${team.name}'s uploaded presentation?`)) return;
              void removePresentation(team.id, presentation.storagePath);
            }}
            aria-label={`Remove ${team.name}'s presentation`}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-bg text-mute transition-colors hover:border-danger/40 hover:text-danger"
          >
            ×
          </button>
        </>
      )}
    </div>
  );
}

// ─── Projector carousel messages (three configurable slots) ───────────────
// Edited live by the coordinator. The projector's idle carousel reads each
// slot via useMessage(slot) and skips slots whose body is blank.

const MESSAGE_SLOTS: { slot: MessageSlot; label: string; defaultRole: string; placeholder: string }[] =
  (['faculty', 'hod', 'studentCoord'] as const).map((slot) => ({
    slot,
    label: EVENT.messageSlots[slot].label,
    defaultRole: EVENT.messageSlots[slot].defaultRole,
    placeholder: EVENT.messageSlots[slot].hint,
  }));

function MessagesManager() {
  return (
    <Section title="Projector messages" badge="rotate on the big screen — three message slots">
      <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
        These three messages cycle on the <b>/screen</b> projector view, alongside the event poster and the judges panel.
        Leave a slot empty and it&apos;s skipped on the carousel — handy if a message isn&apos;t finalised yet.
      </p>
      <div className="space-y-3">
        {MESSAGE_SLOTS.map((cfg) => (
          <MessageEditor key={cfg.slot} {...cfg} />
        ))}
      </div>
    </Section>
  );
}

function MessageEditor({
  slot, label, defaultRole, placeholder,
}: { slot: MessageSlot; label: string; defaultRole: string; placeholder: string }) {
  const live = useMessage(slot);
  const [from, setFrom] = useState(live.from);
  const [role, setRole] = useState(live.role);
  const [body, setBody] = useState(live.body);
  const [savedAt, setSavedAt] = useState<number>(live.updatedAt);

  // Hydrate fields when the synced value first arrives or another device edits it.
  useEffect(() => {
    if (live.updatedAt && live.updatedAt !== savedAt) {
      setFrom(live.from);
      setRole(live.role);
      setBody(live.body);
      setSavedAt(live.updatedAt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.updatedAt]);

  const dirty = from !== live.from || role !== live.role || body !== live.body;
  const canSave = body.trim().length > 0 && from.trim().length > 0;

  const save = () => {
    const msg: ScreenMessage = {
      from: from.trim(),
      role: role.trim() || defaultRole,
      body: body.trim(),
      updatedAt: Date.now(),
    };
    writeMessage(slot, msg);
    setSavedAt(msg.updatedAt);
  };
  const clear = () => {
    if (!confirm(`Clear the ${label.toLowerCase()} message? The slide will be hidden from the projector.`)) return;
    const empty: ScreenMessage = { from: '', role: '', body: '', updatedAt: Date.now() };
    writeMessage(slot, empty);
    setFrom(''); setRole(''); setBody(''); setSavedAt(empty.updatedAt);
  };

  const wordCount = body.trim().length === 0 ? 0 : body.trim().split(/\s+/).length;
  const isLive = body.trim().length > 0;

  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="font-display text-[14px] font-semibold tracking-tight text-ink">{label}</h4>
        <span
          className={`font-mono text-[9.5px] uppercase tracking-[0.18em] ${
            isLive ? 'text-accent' : 'text-mute'
          }`}
        >
          {isLive ? '● On carousel' : '○ Hidden'}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          maxLength={64}
          placeholder="Name (e.g. Dr. Anita Sharma)"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none transition-colors focus:border-primary"
        />
        <input
          type="text"
          maxLength={64}
          placeholder={defaultRole}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-xl border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none transition-colors focus:border-primary"
        />
      </div>
      <textarea
        rows={4}
        maxLength={600}
        placeholder={placeholder}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="mt-2 w-full resize-none rounded-xl border border-line bg-bg px-3 py-2.5 text-[13.5px] leading-relaxed text-ink outline-none transition-colors focus:border-primary"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
          {wordCount > 60 ? <span className="text-spark"> · long — consider shortening</span> : null}
        </span>
        <div className="flex gap-2">
          {isLive && (
            <button
              onClick={clear}
              className="rounded-xl border border-line bg-transparent px-3 py-1.5 text-[12px] font-medium text-mute transition-colors hover:border-danger/40 hover:text-danger"
            >
              Clear
            </button>
          )}
          <button
            onClick={save}
            disabled={!dirty || !canSave}
            className="rounded-xl bg-primary px-4 py-1.5 text-[12.5px] font-semibold text-white shadow-glow transition-all hover:-translate-y-px hover:bg-primary-2 hover:shadow-glow-lg disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-mute disabled:shadow-none"
          >
            {dirty ? 'Save' : 'Saved'}
          </button>
        </div>
      </div>
    </div>
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
  const [prompt, setPrompt] = useState<string>('Pitch a startup that uses the venue cafeteria in some way.');
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
