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

        {hydrated && !team && (
          <section className="py-8 text-center">
            <span className="mb-[18px] inline-block rounded-full border border-accent/30 bg-accent/[0.06] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
              Innovation Showcase Experience
            </span>
            <h1 className="mb-[18px] inline-block bg-gradient-to-b from-ink to-ink/65 bg-clip-text text-[clamp(48px,11vw,88px)] font-bold leading-[0.92] tracking-[-0.04em] text-transparent">
              INNOVATRI<span className="x-letter inline-block animate-x-cycle text-primary [-webkit-text-fill-color:#7c3aed]">X</span>
            </h1>
            <p className="mx-auto max-w-[460px] text-[15px] leading-relaxed text-ink-2">
              Not about perfect products. About <strong className="font-medium text-ink">powerful ideas</strong> and the future you can build. Welcome to a six-hour experience for sixteen teams.
            </p>
            <div className="mt-[22px] flex flex-wrap justify-center gap-[18px] font-mono text-[11px] uppercase tracking-[0.22em] text-mute">
              <span>Innovation</span>
              <span className="text-primary">·</span>
              <span>Creativity</span>
              <span className="text-primary">·</span>
              <span>Future Potential</span>
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
              <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-accent">
                {editing ? 'Edit · update your team' : 'Step 01 · Lock in'}
              </div>
              <h2 className="font-display text-[28px] font-semibold leading-tight tracking-tight">
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
    </ToastProvider>
  );
}
