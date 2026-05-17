'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { Landing } from '@/components/Landing';
import { RegisterForm } from '@/components/RegisterForm';
import { TeamDashboard } from '@/components/TeamDashboard';
import { ToastProvider, useToast } from '@/components/Toast';
import { ParticipantSync } from '@/components/ParticipantSync';
import { readOwnTeam, writeOwnTeam, type Team } from '@/lib/teams';
import { readAppToken, writeAppToken, clearAppToken } from '@/lib/auth-client';

/**
 * Participant entry point.
 *
 * Two views, gated by whether this device has a registered team:
 * - Not registered -> Landing (marketing-style poster page, register at the bottom)
 * - Registered     -> TeamDashboard (the working surface for the day)
 *
 * Phase 3 changed team writes: the client no longer writes teams/* directly
 * to Supabase. Both create and edit go through /api/team/register and
 * /api/team/update, which validate input server-side and write the row
 * using a team-bound JWT. The JWT comes back to the client and is stored
 * via writeAppToken — it's the proof of ownership for subsequent edits.
 */
export default function ParticipantPage() {
  return (
    <ToastProvider>
      <ParticipantShell />
    </ToastProvider>
  );
}

function ParticipantShell() {
  // `hydrated` ensures we don't render the wrong view during SSR / first paint.
  const [hydrated, setHydrated] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { push: toast } = useToast();

  useEffect(() => {
    setTeam(readOwnTeam());
    setHydrated(true);
  }, []);

  const handleSubmit = async (input: Team) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const apiBody = {
        name: input.name,
        color: input.color,
        members: input.members,
        idea: input.idea,
      };

      const existingToken = readAppToken();
      const isEdit = !!team && existingToken?.app_role === 'team' && existingToken.team_id === team.id;

      let savedTeam: Team;

      if (isEdit) {
        // Edit path — needs the team JWT to authorize the write.
        const res = await fetch('/api/team/update', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${existingToken.token}`,
          },
          body: JSON.stringify(apiBody),
        });
        if (res.status === 401) {
          toast('Your session expired. Please re-register your team.');
          clearAppToken();
          writeOwnTeam(null as unknown as Team);
          window.localStorage.removeItem('innovatrix26.team');
          setTeam(null);
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({} as { error?: string }));
          toast(j.error || 'Could not save changes.');
          return;
        }
        const data = (await res.json()) as { team: Team; token?: string; exp?: number };
        savedTeam = data.team;
        if (data.token && data.exp) {
          // The server refreshed the token because it was close to expiring.
          writeAppToken({
            token: data.token,
            exp: data.exp,
            app_role: 'team',
            team_id: savedTeam.id,
          });
        }
      } else {
        // Create path — no token required. Server generates id + JWT.
        const res = await fetch('/api/team/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(apiBody),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({} as { error?: string }));
          toast(j.error || 'Could not register team.');
          return;
        }
        const data = (await res.json()) as { team: Team; token: string; exp: number };
        savedTeam = data.team;
        writeAppToken({
          token: data.token,
          exp: data.exp,
          app_role: 'team',
          team_id: savedTeam.id,
        });
      }

      writeOwnTeam(savedTeam);
      setTeam(savedTeam);
      setEditing(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  // Three view states, mutually exclusive:
  //   - showLanding   : no team yet -> full marketing landing + register form
  //   - showEditPanel : team exists + editing -> just the focused edit form
  //                     (not the full marketing scroll, which used to make
  //                     the user scroll 6 screens past Hero / Phase spine /
  //                     etc. to reach the form)
  //   - showDashboard : team exists + not editing -> activity dashboard
  const showLanding   = hydrated && !team;
  const showEditPanel = hydrated && team && editing;
  const showDashboard = hydrated && team && !editing;

  return (
    <>
      <TopBar />
      <ParticipantSync />

      {showLanding && (
        <Landing onSubmit={handleSubmit} />
      )}

      {showEditPanel && team && (
        <main className="mx-auto max-w-[720px] px-5 pb-20 pt-8">
          <button
            onClick={() => setEditing(false)}
            className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-mute transition-colors hover:text-ink"
          >
            <span aria-hidden>&larr;</span>
            Back to dashboard
          </button>
          <div className="mb-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-mute">
            <span className="h-px w-8 bg-line-2" />
            Edit team
          </div>
          <h1 className="mb-8 font-display text-[clamp(28px,4vw,40px)] font-bold leading-tight tracking-tight text-ink">
            Update your <span className="font-serif italic font-light text-primary">registration.</span>
          </h1>
          <div className="animate-view-in">
            <RegisterForm initial={team} onSubmit={handleSubmit} />
          </div>
        </main>
      )}

      {showDashboard && team && (
        <main className="mx-auto max-w-[720px] px-5 pb-20 pt-6">
          <div className="animate-view-in">
            <TeamDashboard team={team} onEdit={() => setEditing(true)} />
          </div>
        </main>
      )}
    </>
  );
}
