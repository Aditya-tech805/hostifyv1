'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { Landing } from '@/components/Landing';
import { TeamDashboard } from '@/components/TeamDashboard';
import { ToastProvider } from '@/components/Toast';
import { ParticipantSync } from '@/components/ParticipantSync';
import { readOwnTeam, writeOwnTeam, type Team } from '@/lib/teams';
import { writeTeam } from '@/lib/data';

/**
 * Participant entry point.
 *
 * Two views, gated by whether this device has a registered team:
 * - Not registered → Landing (marketing-style poster page, register at the bottom)
 * - Registered     → TeamDashboard (the working surface for the day)
 *
 * Editing an existing registration drops you back into the landing register section.
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
    writeTeam(next);        // sync to Supabase (or localStorage fallback)
    setTeam(next);
    setEditing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showLanding   = hydrated && (!team || editing);
  const showDashboard = hydrated && team && !editing;

  return (
    <ToastProvider>
      <TopBar />
      <ParticipantSync />

      {showLanding && (
        <Landing
          initial={editing ? team ?? undefined : undefined}
          onSubmit={handleSubmit}
        />
      )}

      {showDashboard && team && (
        <main className="mx-auto max-w-[720px] px-5 pb-20 pt-6">
          <div className="animate-view-in">
            <TeamDashboard team={team} onEdit={() => setEditing(true)} />
          </div>
        </main>
      )}
    </ToastProvider>
  );
}
