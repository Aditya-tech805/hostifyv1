'use client';

import { ClockCard } from './ClockCard';
import { ActivityCard } from './ActivityCard';
import type { Team } from '@/lib/teams';

interface TeamDashboardProps {
  team: Team;
  onEdit: () => void;
}

export function TeamDashboard({ team, onEdit }: TeamDashboardProps) {
  return (
    <>
      {/* Coloured team banner */}
      <div
        className="relative overflow-hidden rounded-[24px] p-8"
        style={{
          background: `linear-gradient(135deg, ${team.color}, color-mix(in srgb, ${team.color} 60%, #0a0a0f))`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.18) 0, transparent 50%), radial-gradient(circle at 0% 100%, rgba(0,0,0,0.20) 0, transparent 50%)',
          }}
        />
        <div className="relative">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/70">
            Welcome, team
          </div>
          <h2 className="mt-1 font-display text-3xl font-semibold leading-tight tracking-tight text-white">
            {team.name}
          </h2>
          <div className="mt-3.5 text-[13px] text-white/85">
            {team.members.length} {team.members.length === 1 ? 'member' : 'members'} · {team.members.join(', ')}
          </div>
          <div className="mt-4 border-t border-white/20 pt-4 text-[14.5px] leading-relaxed text-white/95">
            &ldquo;{team.idea}&rdquo;
          </div>
        </div>
      </div>

      {/* Phase status */}
      <div className="mt-4">
        <ClockCard compact />
      </div>

      {/* Activity grid */}
      <section className="mt-8">
        <div className="mb-4">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-accent">
            Activity hub
          </div>
          <h2 className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-tight">
            What&apos;s available right now.
          </h2>
          <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">
            Cards light up as the day progresses. The locked ones unlock when their phase begins.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <ActivityCard id="booth"      icon="📸" title="Photo Booth"        description="Snap a selfie. Frame's on us." />
          <ActivityCard id="idea-cards" icon="💡" title="Idea Card Roulette" description="Random prompts to sharpen your pitch." />
          <ActivityCard id="bingo"      icon="🎯" title="Networking Bingo"  description="16 missions across the floor." />
          <ActivityCard id="team-wall"  icon="🌐" title="Team Wall"          description="Browse every team's idea." />
          <ActivityCard id="pitch-lab"  icon="🎤" title="Pitch Lab"          description="Refine your 5-minute pitch." />
          <ActivityCard id="spotlight"  icon="✨" title="Spotlight"          description="Random teams selected at 1 PM." />
          <ActivityCard id="vote"       icon="🗳️" title="Audience Vote"     description="Opens during Phase 3." />
        </div>

        <button
          onClick={onEdit}
          className="mt-8 w-full rounded-2xl border border-line-2 bg-surface px-5 py-4 text-[15px] font-medium text-ink-2 transition-colors hover:border-primary hover:text-ink"
        >
          Edit team details
        </button>
      </section>
    </>
  );
}
