'use client';

import { useEffect, useMemo, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { PinKeypad } from '@/components/PinKeypad';
import { ToastProvider, useToast } from '@/components/Toast';
import { JUDGING_CRITERIA, PINS } from '@/lib/activities';
import { type Team } from '@/lib/teams';
import { pad } from '@/lib/schedule';
import { readString, writeString, removeKey, STORAGE_KEYS } from '@/lib/storage';
import { useAllTeams, useJudgeScores, useUpNext, type ScoreEntry } from '@/lib/data';

type Stage = 'pin' | 'name' | 'console';

export default function JudgesPage() {
  return (
    <ToastProvider>
      <JudgesShell />
    </ToastProvider>
  );
}

function JudgesShell() {
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
        role="Judge Access"
        roleTone="accent"
        title="Enter judges PIN"
        subtitle="Six digits. Shared with all judges — you'll enter your name on the next screen."
        correctPin={PINS.judge}
        onSuccess={() => {
          writeString(STORAGE_KEYS.judgeAuth, '1');
          setStage('name');
        }}
      />
    );
  }

  if (stage === 'name') {
    return (
      <NameStage
        onSubmit={(name) => {
          writeString(STORAGE_KEYS.judgeName, name);
          setStage('console');
        }}
      />
    );
  }

  return (
    <JudgeConsole
      onSignOut={() => {
        if (!confirm('Sign out? Your scores are kept on this device.')) return;
        removeKey(STORAGE_KEYS.judgeAuth);
        removeKey(STORAGE_KEYS.judgeName);
        setStage('pin');
      }}
    />
  );
}

function NameStage({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');
  const submit = () => {
    if (name.trim().length < 2) return;
    onSubmit(name.trim());
  };
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="mb-9 flex items-center gap-2.5 font-display text-lg font-semibold">
        <BrandMark stroke="#84cc16" dot="#7c3aed" size={24} />
        <span>INNOVATRIX</span>
      </div>
      <div className="w-full max-w-[420px] rounded-2xl border border-line bg-surface p-8">
        <h2 className="mb-2 font-display text-[22px] font-semibold tracking-tight">Who&apos;s judging today?</h2>
        <p className="mb-[22px] text-sm leading-relaxed text-ink-2">
          We tag every score with your name so the coordinator can resolve ties cleanly later.
        </p>
        <label className="mb-2 block font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">
          Your name
        </label>
        <input
          autoFocus
          type="text"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          autoComplete="name"
          placeholder="e.g. Rahul Chauhan"
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-[15px] text-ink outline-none transition-colors focus:border-accent"
        />
        <button
          onClick={submit}
          disabled={name.trim().length < 2}
          className="mt-[18px] w-full rounded-2xl bg-accent px-5 py-4 text-[15px] font-semibold text-bg transition-all hover:-translate-y-px hover:bg-accent-2 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute"
        >
          Begin judging →
        </button>
      </div>
    </section>
  );
}

function totalOf(entry: ScoreEntry | undefined): number {
  if (!entry) return 0;
  return JUDGING_CRITERIA.reduce((acc, c) => acc + ((entry as Record<string, number | string | undefined>)[c.id] as number | undefined ?? 0), 0);
}

function JudgeConsole({ onSignOut }: { onSignOut: () => void }) {
  const judgeName = readString(STORAGE_KEYS.judgeName) ?? 'anon';
  const teams = useAllTeams();
  const { scores, setScore: setScoreForTeam } = useJudgeScores(judgeName);
  const [sheetTeamId, setSheetTeamId] = useState<string | null>(null);
  const [upNext] = useUpNext();

  const scoresFor = (teamId: string): ScoreEntry | undefined => scores[teamId];

  // Auto-open the score sheet for the current Up Next team — judges flow:
  // coordinator marks team as presenting → judges' phone jumps to their scoring sheet.
  // Only fires when no other sheet is open (don't yank a judge mid-write).
  useEffect(() => {
    if (upNext?.teamId && !sheetTeamId) {
      setSheetTeamId(upNext.teamId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upNext?.teamId]);

  const scoredCount = teams.filter((t) => scoresFor(t.id)).length;
  const totalCount = teams.length;
  const progress = totalCount > 0 ? (scoredCount / totalCount) * 100 : 0;

  const openNext = (afterTeamId: string) => {
    const idx = teams.findIndex((t) => t.id === afterTeamId);
    const next = teams.find((t, i) => i > idx && !scoresFor(t.id))
              ?? teams.find((t) => !scoresFor(t.id));
    setSheetTeamId(next?.id ?? null);
  };

  const sheetTeam = sheetTeamId ? teams.find((t) => t.id === sheetTeamId) ?? null : null;

  return (
    <div>
      <header className="sticky top-0 z-50 border-b border-line bg-bg/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-[880px] items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-2.5 font-display font-semibold tracking-tight">
            <BrandMark stroke="#84cc16" dot="#7c3aed" size={20} />
            <span>INNOVATRIX</span>
            <span className="rounded-full border border-accent/40 bg-accent/[0.08] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              Judge · {judgeName}
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
          <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-accent">
            Phase 3 · Presentation Round
          </div>
          <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tight">
            Score each team as they present.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            Five criteria, 0–10 each. Notes optional but encouraged — they help the coordinator break ties. Your scores auto-save the moment you slide a value.
          </p>
        </div>

        <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-surface">
          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="mb-[18px] mt-1.5 flex justify-between font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">
          <span><span className="text-accent">{scoredCount}</span> scored</span>
          <span>of {totalCount}</span>
        </div>

        {upNext && (() => {
          const t = teams.find((tt) => tt.id === upNext.teamId);
          if (!t) return null;
          return (
            <button
              onClick={() => setSheetTeamId(t.id)}
              className="mb-4 flex w-full items-center justify-between rounded-2xl border border-accent bg-accent/[0.08] px-4 py-3.5 text-left transition-colors hover:bg-accent/[0.14]"
            >
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 animate-pulse-soft rounded-full bg-accent" />
                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-accent">Now presenting</span>
                <span className="font-display text-[15px] font-semibold">{t.name}</span>
              </div>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent">Score →</span>
            </button>
          );
        })()}

        {teams.length === 0 ? (
          <div className="py-16 text-center text-sm leading-relaxed text-mute">
            Teams will appear here once registration opens. Right now there are no teams to judge.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {teams.map((t, idx) => {
              const entry = scoresFor(t.id);
              const total = totalOf(entry);
              const scored = !!entry;
              return (
                <button
                  key={t.id}
                  onClick={() => setSheetTeamId(t.id)}
                  className={`relative rounded-[18px] border bg-surface p-[18px] text-left transition-all hover:-translate-y-0.5 hover:border-accent ${
                    scored ? 'border-accent/40' : 'border-line'
                  }`}
                >
                  <div className="mb-3 h-1 rounded" style={{ background: t.color }} />
                  <h3 className="font-display text-[17px] font-semibold leading-tight tracking-tight">{t.name}</h3>
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-ink-2">{t.idea}</p>
                  <div className="mt-3.5 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
                    <span>Team #{pad(idx + 1)}</span>
                    <span className={scored ? 'font-semibold text-accent' : ''}>
                      {scored ? `${total} / 50` : 'Not scored'}
                    </span>
                  </div>
                  {scored && (
                    <span className="absolute right-3.5 top-3.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent text-[13px] font-bold text-bg">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>

      {sheetTeam && (
        <ScoreSheet
          team={sheetTeam}
          index={teams.findIndex((t) => t.id === sheetTeam.id)}
          total={teams.length}
          initial={scoresFor(sheetTeam.id)}
          onClose={() => setSheetTeamId(null)}
          onSave={(entry) => setScoreForTeam(sheetTeam.id, entry)}
          onSaveAndNext={(entry) => {
            setScoreForTeam(sheetTeam.id, entry);
            openNext(sheetTeam.id);
          }}
        />
      )}
    </div>
  );
}

function ScoreSheet({
  team, index, total, initial, onClose, onSave, onSaveAndNext,
}: {
  team: Team;
  index: number;
  total: number;
  initial?: ScoreEntry;
  onClose: () => void;
  onSave: (entry: ScoreEntry) => void;
  onSaveAndNext: (entry: ScoreEntry) => void;
}) {
  const { push: toast } = useToast();
  const [entry, setEntry] = useState<ScoreEntry>(() => initial ?? {});

  // Reset entry when team changes
  useEffect(() => {
    setEntry(initial ?? {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id]);

  const setVal = (id: string, value: number | string) => {
    const next = { ...entry, [id]: value };
    setEntry(next);
    onSave(next);
  };

  const totalScore = useMemo(() => totalOf(entry), [entry]);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-bg pb-[100px]">
      <div className="sticky top-0 z-[60] border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[720px] items-center justify-between gap-3 px-5 py-3.5">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-transparent px-3.5 py-2 text-[13px] text-ink-2 transition-colors hover:border-accent hover:text-accent"
          >
            ← Teams
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">
            Team {pad(index + 1)} / {pad(total)}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-[720px] px-5 pt-6">
        <div
          className="relative mb-[22px] overflow-hidden rounded-2xl p-7"
          style={{
            background: `linear-gradient(135deg, ${team.color}, color-mix(in srgb, ${team.color} 50%, #0a0a0f))`,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.16) 0, transparent 50%)' }}
          />
          <div className="relative font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/70">
            Now scoring
          </div>
          <h1 className="relative mt-1 font-display text-[30px] font-semibold leading-tight tracking-tight text-white">
            {team.name}
          </h1>
          <div className="relative mt-3.5 text-[14.5px] leading-relaxed text-white/95">
            &ldquo;{team.idea}&rdquo;
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-2.5">
          {JUDGING_CRITERIA.map((c) => {
            const v = (entry as Record<string, number | string | undefined>)[c.id] as number | undefined ?? 0;
            return (
              <div key={c.id} className="rounded-2xl border border-line bg-surface p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-display text-[15px] font-semibold tracking-tight">
                    {c.name}
                    <small className="mt-0.5 block font-sans text-xs font-normal normal-case tracking-normal text-mute">{c.hint}</small>
                  </div>
                  <div className="min-w-[56px] text-right font-mono text-[22px] font-semibold text-accent">{v}</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={v}
                  onChange={(e) => setVal(c.id, parseInt(e.target.value, 10))}
                  className="w-full"
                />
                <div className="mt-1.5 flex justify-between px-2 font-mono text-[10px] tracking-wider text-mute">
                  <span>0</span><span>5</span><span>10</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <label className="mb-2.5 block font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">
            Private notes <span className="ml-1 font-sans text-xs font-normal normal-case tracking-normal text-mute">— visible only to you &amp; the coordinator</span>
          </label>
          <textarea
            value={entry.notes ?? ''}
            onChange={(e) => setVal('notes', e.target.value)}
            placeholder="What stood out? Was anything unclear?"
            className="min-h-[100px] w-full resize-y rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-sm leading-relaxed text-ink outline-none transition-colors focus:border-accent"
          />
        </div>
      </div>

      {/* Save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] border-t border-line bg-bg/92 px-5 py-3.5 backdrop-blur-md [padding-bottom:calc(theme(spacing.3.5)+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-[720px] items-center gap-2.5">
          <div className="font-mono text-[13px] uppercase tracking-[0.08em] text-mute">
            Total · <b className="text-base text-accent">{totalScore}</b> / 50
          </div>
          <button
            onClick={() => {
              onSaveAndNext(entry);
              toast('Saved.');
            }}
            className="flex-1 rounded-xl bg-accent px-5 py-3.5 text-[15px] font-semibold text-bg transition-all hover:-translate-y-px hover:bg-accent-2"
          >
            Save &amp; next →
          </button>
        </div>
      </div>
    </div>
  );
}
