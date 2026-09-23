'use client';

import { TopBar } from '@/components/TopBar';
import { ParticipantSync } from '@/components/ParticipantSync';
import { ActivityHeader } from '@/components/ActivityHeader';
import { ClientOnly } from '@/components/ClientOnly';
import { useSeniors, type Senior } from '@/lib/data';

/**
 * /activities/connect
 *
 * Curated list of mentors, alumni and guests in the room. Each card opens their
 * LinkedIn profile in a new tab. List is coordinator-managed from
 * /console -> "Connect list" so it can be edited live (e.g. when a
 * mentor joins late or drops out).
 */
export default function ConnectPage() {
  return (
    <>
      <TopBar />
      <ParticipantSync />
      <main className="mx-auto max-w-[820px] px-5 pb-20 pt-6">
        <ActivityHeader
          step="Activity - All day"
          title="Connect on LinkedIn"
          description="Mentors, alumni and guests in the room have agreed to be reached out to. Tap a card to open their LinkedIn profile and send a connection request before the day ends."
        />
        <ClientOnly fallback={<SeniorListSkeleton />}>
          <SeniorListLive />
        </ClientOnly>
      </main>
    </>
  );
}

function SeniorListLive() {
  const seniors = useSeniors();
  if (seniors.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-line-2 bg-surface p-10 text-center">
        <div className="mb-3 text-3xl" role="img" aria-label="People">🤝</div>
        <p className="text-[15px] leading-relaxed text-ink-2">
          The connect list is being <span className="font-serif italic font-light text-accent">finalised</span> by the coordinator.
          <br />
          <span className="text-mute">Check back in a few minutes.</span>
        </p>
      </div>
    );
  }
  return (
    <div className="mt-8 grid gap-3">
      {seniors.map((s) => <SeniorCard key={s.id} senior={s} />)}
    </div>
  );
}

function SeniorCard({ senior }: { senior: Senior }) {
  return (
    <a
      href={senior.linkedinUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-glow-cyan"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-[14px] font-bold tracking-tight text-bg"
        style={{ background: senior.color }}
      >
        {senior.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={senior.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{initialsOf(senior.name)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[16px] font-semibold leading-tight tracking-tight text-ink">
          {senior.name}
        </div>
        <div className="mt-1 truncate font-mono text-[10.5px] uppercase tracking-[0.18em] text-mute">
          {senior.role}
        </div>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#0A66C2] px-3 py-1.5 font-display text-[12px] font-semibold text-white transition-transform group-hover:translate-x-0.5">
        <span className="font-mono text-[10px] font-bold">in</span>
        Connect
        <span aria-hidden>&rarr;</span>
      </span>
    </a>
  );
}

function SeniorListSkeleton() {
  return (
    <div className="mt-8 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[80px] rounded-2xl border border-line-2 bg-surface/60" />
      ))}
    </div>
  );
}

function initialsOf(name: string): string {
  const parts = name.replace(/[\[\]().]/g, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
