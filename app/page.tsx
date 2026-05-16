'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { ClockCard } from '@/components/ClockCard';
import { RegisterForm } from '@/components/RegisterForm';
import { TeamDashboard } from '@/components/TeamDashboard';
import { ToastProvider } from '@/components/Toast';
import { SpotlightOverlay } from '@/components/SpotlightOverlay';
import { ResultsOverlay } from '@/components/ResultsOverlay';
import { MentorPingsBanner } from '@/components/MentorPingsBanner';
import { PollResponder } from '@/components/PollResponder';
import { SprintResponder } from '@/components/SprintResponder';
import { PauseBanner } from '@/components/PauseBanner';
import { readOwnTeam, writeOwnTeam, type Team } from '@/lib/teams';
import { writeTeam } from '@/lib/data';

/**
 * Participant entry point. Shows the registration flow if no team is registered
 * on this device, otherwise jumps straight to the dashboard.
 */
export default function ParticipantPage() {
  // `hydrated` ensures we don't render the wrong view during SSR / first paint.
  const [hydrated, setHydrated] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setTeam(readOwnTeam());
    setHydrated(true);
  }, []);

  const handleSubmit = (next: Team) => {
    writeOwnTeam(next);     // keep a local copy for this device
    writeTeam(next);        // sync to Firebase (or localStorage fallback)
    setTeam(next);
    setEditing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showRegistration = hydrated && (!team || editing);
  const showDashboard    = hydrated && team && !editing;

  return (
    <ToastProvider>
      <TopBar />
      <MentorPingsBanner teamId={team?.id ?? null} />
      <main className="mx-auto max-w-[720px] px-5 pb-20 pt-6">
        {/* Sprint + Poll responders only appear when coordinator triggers them */}
        <SprintResponder />
        <PollResponder />


        {hydrated && !team && (
          <section className="relative py-10 text-center">
            {/* Floating backdrop circles for depth */}
            <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl animate-float-slow" />
            <div className="pointer-events-none absolute -right-20 top-20 h-80 w-80 rounded-full bg-accent/15 blur-3xl animate-float-slow" style={{ animationDelay: '7s' }} />
            <div className="pointer-events-none absolute left-1/2 -top-12 h-64 w-64 -translate-x-1/2 rounded-full bg-secondary/10 blur-3xl" />

            <div className="relative">
              <span className="mb-[18px] inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/60 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-primary backdrop-blur-md shadow-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-dot-pulse" />
                Innovation Showcase Experience
              </span>
              <h1 className="mb-[18px] font-display text-[clamp(56px,12vw,120px)] font-extrabold leading-[0.92] tracking-[-0.04em] text-ink">
                INNOVATRI<span className="inline-block animate-x-cycle bg-gradient-brand bg-clip-text text-transparent">X</span>
              </h1>
              <p className="mx-auto max-w-[480px] text-[16px] leading-relaxed text-ink-2">
                Not about perfect products. About <strong className="font-semibold text-ink">powerful ideas</strong> and the future you can build. Welcome to a six-hour experience for sixteen teams.
              </p>
              <div className="mt-[22px] flex flex-wrap justify-center gap-[18px] font-mono text-[11px] uppercase tracking-[0.22em] text-mute">
                <span>Innovation</span>
                <span className="text-primary">·</span>
                <span>Creativity</span>
                <span className="text-primary">·</span>
                <span>Future Potential</span>
              </div>
            </div>
          </section>
        )}

        {hydrated && !team && (
          <div className="mt-8">
            <ClockCard />
          </div>
        )}

        {showRegistration && (
          <section className="mt-8 animate-view-in">
            <div className="mb-[18px]">
              <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-primary">
                {editing ? 'Edit · update your team' : 'Step 01 · Lock in'}
              </div>
              <h2 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-ink">
                {editing ? 'Update team details.' : 'Register your team.'}
              </h2>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">
                One person per team. Pick a name, a colour, list your members, and tell us your one-line idea. The rest of the day rebuilds around what you submit here.
              </p>
            </div>
            <RegisterForm initial={editing ? team ?? undefined : undefined} onSubmit={handleSubmit} />
          </section>
        )}

        {showDashboard && team && (
          <div className="animate-view-in">
            <TeamDashboard team={team} onEdit={() => setEditing(true)} />
          </div>
        )}

      </main>

      <footer className="mx-auto mt-12 max-w-[720px] border-t border-line px-5 py-8 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
        INNOVATRIX · 2026 · A Student Coordinator Production
      </footer>

      {/* Synced moments — appear on every device when triggered from coordinator */}
      <SpotlightOverlay />
      <ResultsOverlay />
      <PauseBanner />
    </ToastProvider>
  );
}
