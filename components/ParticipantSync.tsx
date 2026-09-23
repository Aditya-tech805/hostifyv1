'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ParticipantSync — bundles every coordinator-triggered overlay/banner that
// must appear on participant-facing pages.
//
// Mount this once per participant page (landing, every /activities/* page).
// It self-loads the current team from localStorage for the mentor-pings
// banner. Each child component handles its own visibility — they render
// nothing when the relevant state is null.
//
// Why one component:
//  - Activities pages used to mount only TopBar + their page content, so
//    spotlight/sprint/poll/pause never appeared there. Bug.
//  - Bundling here means every participant surface gets the same overlays
//    by adding ONE component.
//
// All three inline banners (MentorPingsBanner, SprintResponder, PollResponder)
// were refactored to be self-contained (no `-mx-5` negative margin) so they
// can sit at top level without overflowing the viewport.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { readOwnTeam } from '@/lib/teams';
import { STORAGE_KEYS } from '@/lib/storage';
import { MentorPingsBanner } from './MentorPingsBanner';
import { SprintResponder } from './SprintResponder';
import { PollResponder } from './PollResponder';
import { SpotlightOverlay } from './SpotlightOverlay';
import { ResultsOverlay } from './ResultsOverlay';
import { PauseBanner } from './PauseBanner';

export function ParticipantSync() {
  const [teamId, setTeamId] = useState<string | null>(null);
  useEffect(() => {
    setTeamId(readOwnTeam()?.id ?? null);
    // Cross-tab: refresh teamId when localStorage changes (e.g., another tab
    // registered or cleared the team).
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.team) setTeamId(readOwnTeam()?.id ?? null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <>
      <MentorPingsBanner teamId={teamId} />
      <SprintResponder />
      <PollResponder />
      <SpotlightOverlay />
      <ResultsOverlay />
      <PauseBanner />
    </>
  );
}
