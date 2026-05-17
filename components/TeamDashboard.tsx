'use client';

import { useRef, useState } from 'react';
import { ClockCard } from './ClockCard';
import { ActivityCard } from './ActivityCard';
import { useToast } from './Toast';
import type { Team } from '@/lib/teams';
import {
  usePresentation,
  uploadPresentation,
  PRESENTATION_MAX_BYTES,
  type Presentation,
} from '@/lib/data';

interface TeamDashboardProps {
  team: Team;
  onEdit: () => void;
}

export function TeamDashboard({ team, onEdit }: TeamDashboardProps) {
  return (
    <>
      {/* Coloured team banner — bright surface with team-colour gradient backdrop */}
      <div
        className="relative overflow-hidden rounded-[28px] p-8 shadow-soft-lg"
        style={{
          background: `linear-gradient(135deg, ${team.color} 0%, color-mix(in srgb, ${team.color} 80%, #ffffff) 60%, #ffffff 100%)`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.3) 0, transparent 50%), radial-gradient(circle at 0% 100%, rgba(0, 0, 0, 0.08) 0, transparent 50%)',
          }}
        />
        <div className="relative">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/85 mix-blend-difference">
            Welcome, team
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight text-white mix-blend-difference">
            {team.name}
          </h2>
          <div className="mt-3.5 text-[13px] text-white/90 mix-blend-difference">
            {team.members.length} {team.members.length === 1 ? 'member' : 'members'} · {team.members.join(', ')}
          </div>
          <div className="mt-4 border-t border-white/30 pt-4 text-[14.5px] leading-relaxed text-white mix-blend-difference">
            &ldquo;{team.idea}&rdquo;
          </div>
        </div>
      </div>

      {/* Phase status */}
      <div className="mt-4">
        <ClockCard compact />
      </div>

      {/* Presentation upload — coordinator pulls these up during judging. */}
      <section className="mt-6">
        <PresentationCard team={team} />
      </section>

      {/* Activity grid */}
      <section className="mt-8">
        <div className="mb-4">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-primary">
            Activity hub
          </div>
          <h2 className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-tight text-ink">
            What&apos;s available right now.
          </h2>
          <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">
            Cards light up as the day progresses. The locked ones unlock when their phase begins.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 [@media(min-width:360px)]:grid-cols-2">
          <ActivityCard id="booth"      icon="📸" title="Photo Booth"       description="Snap a selfie. Frame's on us." />
          <ActivityCard id="bingo"      icon="🎯" title="Networking Bingo"  description="16 missions across the floor." />
          <ActivityCard id="team-wall"  icon="🌐" title="Team Wall"         description="Browse every team's idea." />
          <ActivityCard id="connect"    icon="🔗" title="Connect on LinkedIn" description="Reach out to seniors and mentors in the room." />
          <ActivityCard id="spotlight"  icon="✨" title="Spotlight"          description="Coordinator-launched moments. Don't tap — wait." />
          <ActivityCard id="vote"       icon="🗳️" title="Audience Vote"     description="Opens during Phase 3." />
        </div>

        <button
          onClick={onEdit}
          className="mt-8 w-full rounded-2xl border border-line bg-surface px-5 py-4 text-[15px] font-medium text-ink-2 shadow-soft transition-all hover:border-primary hover:text-ink hover:shadow-glow"
        >
          Edit team details
        </button>
      </section>
    </>
  );
}

// ─── Presentation upload card ───────────────────────────────────────────────
//
// One slot per team. PPT / PPTX / PDF, up to 25 MB. Uploads land in the
// `slides` Supabase Storage bucket under <team_id>/presentation.<ext>.
// The coordinator console reads from the synced kv metadata and can
// download / open the file when the team is presenting.

function PresentationCard({ team }: { team: Team }) {
  const { push: toast } = useToast();
  const current = usePresentation(team.id);
  const [busy, setBusy] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onPick = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (busy) return;
    setBusy(true);
    setProgressLabel('Uploading…');
    try {
      await uploadPresentation(file, { id: team.id, name: team.name });
      toast('Presentation uploaded. Coordinator can see it now.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      toast(msg);
    } finally {
      setBusy(false);
      setProgressLabel(null);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <div className="mb-2 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-primary">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
        Your presentation
      </div>
      <h3 className="font-display text-[18px] font-semibold leading-tight tracking-tight text-ink">
        {current ? 'Uploaded - ready for judging.' : 'Upload your slides.'}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
        {current
          ? 'The coordinator will open this file when your team is on stage so the panel can follow along while you present.'
          : 'PPT, PPTX, or PDF up to 25 MB. The coordinator opens it when your team is up - so you can focus on talking, not on driving the slides.'}
      </p>

      {current ? <UploadedRow current={current} /> : null}

      <input
        ref={inputRef}
        type="file"
        accept=".ppt,.pptx,.pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf"
        onChange={onFileChange}
        className="hidden"
      />
      <button
        onClick={onPick}
        disabled={busy}
        className="mt-4 w-full rounded-2xl bg-primary px-5 py-3.5 text-[14.5px] font-semibold text-white shadow-glow transition-all hover:-translate-y-px hover:bg-primary-2 hover:shadow-glow-lg disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute disabled:shadow-none"
      >
        {busy
          ? (progressLabel ?? 'Working…')
          : current
            ? 'Replace presentation'
            : 'Upload presentation'}
      </button>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
        Max {Math.round(PRESENTATION_MAX_BYTES / 1024 / 1024)} MB · pptx / ppt / pdf
      </p>
    </div>
  );
}

function UploadedRow({ current }: { current: Presentation }) {
  const sizeMb = (current.sizeBytes / 1024 / 1024).toFixed(1);
  const when = new Date(current.uploadedAt).toLocaleTimeString('en', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-line-2 bg-surface-2 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/[0.15] font-mono text-[10px] font-bold text-primary-2">
        {extensionLabel(current.filename)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[13.5px] font-semibold text-ink">{current.filename}</div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
          {sizeMb} MB &middot; uploaded {when}
        </div>
      </div>
      <a
        href={current.publicUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-lg border border-line bg-bg px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-accent transition-colors hover:border-accent"
      >
        Preview
      </a>
    </div>
  );
}

function extensionLabel(filename: string): string {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1].toUpperCase().slice(0, 4) : 'FILE';
}
