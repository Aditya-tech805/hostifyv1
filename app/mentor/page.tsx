'use client';

import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { PinKeypad } from '@/components/PinKeypad';
import { ToastProvider, useToast } from '@/components/Toast';
import { PINS } from '@/lib/activities';
import { useAllTeams, sendMentorPing, useMentorPings } from '@/lib/data';
import { readString, writeString, removeKey, STORAGE_KEYS } from '@/lib/storage';
import type { Team } from '@/lib/teams';
import { pad } from '@/lib/schedule';

type Stage = 'pin' | 'name' | 'console';

export default function MentorPage() {
  return (
    <ToastProvider>
      <MentorShell />
    </ToastProvider>
  );
}

function MentorShell() {
  const [stage, setStage] = useState<Stage | null>(null);

  useEffect(() => {
    const authed = readString(STORAGE_KEYS.judgeAuth) === '1';
    const name = readString(STORAGE_KEYS.judgeName);
    if (authed && name) setStage('console');
    else if (authed) setStage('name');
    else setStage('pin');
  }, []);

  if (stage === null) return null;

  if (stage === 'pin') {
    return (
      <PinKeypad
        role="Mentor Access"
        roleTone="accent"
        title="Enter mentor PIN"
        subtitle="Same PIN as judges. Mentor pings during Phase 2; scoring in Phase 3."
        correctPin={PINS.judge}
        onSuccess={() => {
          writeString(STORAGE_KEYS.judgeAuth, '1');
          setStage('name');
        }}
      />
    );
  }
  if (stage === 'name') {
    return <NameStage onSubmit={(name) => { writeString(STORAGE_KEYS.judgeName, name); setStage('console'); }} />;
  }
  return (
    <MentorConsole onSignOut={() => {
      if (!confirm('Sign out?')) return;
      removeKey(STORAGE_KEYS.judgeAuth);
      removeKey(STORAGE_KEYS.judgeName);
      setStage('pin');
    }} />
  );
}

function NameStage({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');
  const submit = () => { if (name.trim().length >= 2) onSubmit(name.trim()); };
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="mb-9 flex items-center gap-2.5 font-display text-lg font-semibold">
        <BrandMark stroke="#84cc16" dot="#7c3aed" size={24} />
        <span>INNOVATRIX</span>
      </div>
      <div className="w-full max-w-[420px] rounded-2xl border border-line bg-surface p-8">
        <h2 className="mb-2 font-display text-[22px] font-semibold tracking-tight">Your mentor name</h2>
        <p className="mb-5 text-sm leading-relaxed text-ink-2">Teams will see this on the ping they receive.</p>
        <input
          autoFocus
          type="text"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="e.g. Rahul Chauhan"
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-[15px] text-ink outline-none focus:border-accent"
        />
        <button
          onClick={submit}
          disabled={name.trim().length < 2}
          className="mt-[18px] w-full rounded-2xl bg-accent px-5 py-4 text-[15px] font-semibold text-white shadow-glow-cyan transition-all hover:-translate-y-px hover:bg-accent-2 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute disabled:shadow-none"
        >
          Begin mentoring →
        </button>
      </div>
    </section>
  );
}

function MentorConsole({ onSignOut }: { onSignOut: () => void }) {
  const mentorName = readString(STORAGE_KEYS.judgeName) ?? 'anon';
  const teams = useAllTeams();
  const [picked, setPicked] = useState<Team | null>(null);
  return (
    <div>
      <header className="sticky top-0 z-50 border-b border-line bg-bg/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-[880px] items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-2.5 font-display font-semibold tracking-tight">
            <BrandMark stroke="#84cc16" dot="#7c3aed" size={20} />
            <span>INNOVATRIX</span>
            <span className="rounded-full border border-accent/40 bg-accent/[0.08] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              Mentor · {mentorName}
            </span>
          </div>
          <button
            onClick={onSignOut}
            className="rounded-full border border-line bg-transparent px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-mute transition-colors hover:border-danger/40 hover:text-danger"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-[880px] px-5 pb-20 pt-6">
        <div className="mb-[22px]">
          <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-accent">Phase 2 · Mentor Mode</div>
          <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tight">
            Ping a team with a tactical question.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            Picks land on their phones with a vibration. Use this to nudge teams toward sharper thinking — &quot;what&apos;s your one-line problem statement?&quot; / &quot;who pays?&quot; / &quot;build the demo before the slides.&quot;
          </p>
        </div>

        {picked ? (
          <ComposePing team={picked} mentorName={mentorName} onBack={() => setPicked(null)} />
        ) : (
          <>
            {teams.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-mute">
                No teams registered yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {teams.map((t, idx) => (
                  <button
                    key={t.id}
                    onClick={() => setPicked(t)}
                    className="relative rounded-[18px] border border-line bg-surface p-[18px] text-left transition-all hover:-translate-y-0.5 hover:border-accent"
                  >
                    <div className="mb-3 h-1 rounded" style={{ background: t.color }} />
                    <h3 className="font-display text-[16px] font-semibold leading-tight tracking-tight">{t.name}</h3>
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-ink-2">{t.idea}</p>
                    <div className="mt-3 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
                      <span>Team #{pad(idx + 1)}</span>
                      <span>Ping →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ComposePing({ team, mentorName, onBack }: { team: Team; mentorName: string; onBack: () => void }) {
  const { push: toast } = useToast();
  const [question, setQuestion] = useState('');
  const pings = useMentorPings(team.id);

  const send = () => {
    const trimmed = question.trim();
    if (trimmed.length < 6) return;
    sendMentorPing(team.id, mentorName, trimmed);
    setQuestion('');
    toast(`Sent to ${team.name}.`);
  };

  return (
    <>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-transparent px-3.5 py-2 text-[13px] text-ink-2 transition-colors hover:border-accent hover:text-accent"
      >
        ← All teams
      </button>

      <div
        className="overflow-hidden rounded-2xl p-6 relative mb-4"
        style={{ background: `linear-gradient(140deg, ${team.color}, color-mix(in srgb, ${team.color} 55%, #0a0a0f))` }}
      >
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.16) 0, transparent 50%)' }} />
        <div className="relative font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/70">Pinging</div>
        <h2 className="relative mt-1 font-display text-[24px] font-semibold leading-tight tracking-tight text-white">{team.name}</h2>
        <p className="relative mt-2 text-[14px] leading-relaxed text-white/95">&ldquo;{team.idea}&rdquo;</p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <label className="mb-2 block font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">Your question</label>
        <textarea
          autoFocus
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={240}
          placeholder="What's the one thing that, if you got it wrong, would kill the idea?"
          className="min-h-[100px] w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-[15px] leading-relaxed text-ink outline-none transition-colors focus:border-accent"
        />
        <button
          onClick={send}
          disabled={question.trim().length < 6}
          className="mt-3.5 w-full rounded-2xl bg-accent px-5 py-4 text-[15px] font-semibold text-white shadow-glow-cyan transition-all hover:-translate-y-px hover:bg-accent-2 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute disabled:shadow-none"
        >
          Send ping →
        </button>
      </div>

      {pings.length > 0 && (
        <div className="mt-6">
          <div className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-mute">
            Pings sent to {team.name} ({pings.length})
          </div>
          <div className="space-y-2">
            {pings.map((p) => (
              <div key={p.id} className="rounded-xl border border-line bg-surface px-4 py-3">
                <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
                  <span>{p.from}</span>
                  <span>
                    {p.acknowledged ? <span className="text-accent">✓ Read</span> : 'Sent'}
                    {' · '}
                    {new Date(p.at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-[14px] leading-relaxed text-ink">{p.question}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
