'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { ActivityHeader } from '@/components/ActivityHeader';
import { ToastProvider, useToast } from '@/components/Toast';
import { BINGO_LINES, BINGO_MISSIONS } from '@/lib/activities';
import { readJSON, writeJSON, STORAGE_KEYS } from '@/lib/storage';

interface BingoState {
  done: number[];
  bingosCelebrated: number;
}

export default function BingoPage() {
  return (
    <ToastProvider>
      <TopBar />
      <main className="mx-auto max-w-[720px] px-5 pb-20 pt-6">
        <ActivityHeader
          step="Activity · Phase 2"
          title="Networking Bingo"
          description="16 missions across the floor. Get off your chair, talk to people, mark missions as you complete them. Hit any row, column, or diagonal for a Bingo. Top 3 cards get a callout at the spotlight reveal."
        />
        <BingoBody />
      </main>
    </ToastProvider>
  );
}

function detectLines(done: Set<number>): number[][] {
  return BINGO_LINES.filter((line) => line.every((i) => done.has(i)));
}

function BingoBody() {
  const { push: toast } = useToast();
  const [state, setState] = useState<BingoState>({ done: [], bingosCelebrated: 0 });
  const [hydrated, setHydrated] = useState(false);
  const [celebration, setCelebration] = useState<number | null>(null);

  useEffect(() => {
    setState(readJSON<BingoState>(STORAGE_KEYS.bingo, { done: [], bingosCelebrated: 0 }));
    setHydrated(true);
  }, []);

  const doneSet = new Set(state.done);
  const lines = detectLines(doneSet);
  const inLine = new Set<number>();
  lines.forEach((line) => line.forEach((i) => inLine.add(i)));

  const toggleCell = (idx: number) => {
    const next = [...state.done];
    const at = next.indexOf(idx);
    if (at >= 0) next.splice(at, 1);
    else next.push(idx);

    const newLines = detectLines(new Set(next));
    const isNewBingo = newLines.length > state.bingosCelebrated;
    const updated: BingoState = {
      done: next,
      bingosCelebrated: isNewBingo ? newLines.length : Math.min(state.bingosCelebrated, newLines.length),
    };
    setState(updated);
    writeJSON(STORAGE_KEYS.bingo, updated);
    if (isNewBingo) {
      setCelebration(newLines.length);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([40, 30, 40, 30, 80]);
      }
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(15);
  };

  const reset = () => {
    if (!confirm('Reset your bingo card? All progress for this card will be lost.')) return;
    const cleared: BingoState = { done: [], bingosCelebrated: 0 };
    setState(cleared);
    writeJSON(STORAGE_KEYS.bingo, cleared);
    toast('Card reset.');
  };

  if (!hydrated) {
    return <div className="mt-6 aspect-square w-full max-w-[600px] rounded-xl border border-line bg-surface" />;
  }

  const statusText = (() => {
    if (lines.length === 0) return state.done.length === 0 ? 'Get moving' : 'Keep going';
    if (lines.length === 1) return '1 Bingo · keep going';
    if (lines.length === 2) return '2 Bingos · one more!';
    return `${lines.length} Bingos · tell the coordinator`;
  })();
  const statusClass = (() => {
    if (lines.length === 0) return 'border-line text-mute';
    if (lines.length === 1) return 'border-accent/40 bg-accent/[0.08] text-accent';
    if (lines.length === 2) return 'border-spark/40 bg-spark/[0.08] text-spark';
    return 'border-primary/40 bg-primary/[0.10] text-primary-2';
  })();

  return (
    <>
      <div className="mb-3.5 mt-[22px] flex flex-wrap items-center justify-between gap-2.5">
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-mute">
          <b className="text-accent text-sm">{state.done.length}</b> / 16 missions
        </span>
        <span className={`rounded-full border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em] ${statusClass}`}>
          {statusText}
        </span>
      </div>

      <div className="mx-auto grid aspect-square w-full max-w-[600px] grid-cols-4 gap-2">
        {BINGO_MISSIONS.map((mission, idx) => {
          const done = doneSet.has(idx);
          const inLineHere = inLine.has(idx);
          return (
            <button
              key={idx}
              onClick={() => toggleCell(idx)}
              className={`relative flex min-h-0 cursor-pointer flex-col justify-between overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-200 hover:scale-[1.02] ${
                done
                  ? inLineHere
                    ? 'border-accent bg-gradient-to-br from-accent to-[color-mix(in_srgb,#84cc16_65%,#000)] text-bg'
                    : 'border-primary bg-gradient-to-br from-primary to-[color-mix(in_srgb,#7c3aed_70%,#000)] text-white'
                  : inLineHere
                    ? 'border-line text-ink-2 [box-shadow:inset_0_0_0_2px_#84cc16]'
                    : 'border-line bg-surface text-ink-2 hover:border-line-2'
              }`}
            >
              <span className={`font-mono text-[9.5px] tracking-[0.16em] ${done ? (inLineHere ? 'text-bg/70' : 'text-white/70') : 'text-mute'}`}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span className={`font-display text-[11px] font-medium leading-tight tracking-tight ${done ? (inLineHere ? 'text-bg' : 'text-white') : 'text-ink'}`}>
                {mission}
              </span>
              {done && (
                <span className={`absolute right-2 top-1.5 text-[11px] font-bold ${inLineHere ? 'text-bg' : 'text-white/95'}`}>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-[22px] rounded-2xl border border-dashed border-line-2 bg-surface p-[18px] text-center text-[13px] leading-relaxed text-ink-2">
        <b className="text-accent">Tip:</b> Tap to mark complete, tap again to undo. Hit a row, column, or diagonal → that&apos;s a Bingo. Three Bingos? Tell the coordinator.
      </div>

      <button
        onClick={reset}
        className="ml-auto mt-4 block rounded-full border border-line bg-transparent px-3.5 py-2.5 text-xs text-mute transition-colors hover:border-danger/40 hover:text-danger"
      >
        Reset card
      </button>

      {/* Celebration overlay */}
      {celebration != null && (
        <div className="fixed inset-0 z-[200] flex animate-fade-in items-center justify-center bg-bg/85 p-5 backdrop-blur-md">
          <div className="max-w-[420px] animate-pop-in rounded-3xl border border-accent bg-surface p-10 text-center shadow-[0_30px_80px_-20px_rgba(132,204,22,0.3)]">
            <span className="mb-4 inline-block animate-bounce text-6xl">🎯</span>
            <h3 className="mb-2 font-display text-[28px] font-semibold tracking-tight">
              {celebration === 1 ? 'BINGO!' : celebration === 2 ? 'DOUBLE BINGO!' : `${celebration}x BINGO!`}
            </h3>
            <p className="mb-6 text-[14.5px] leading-relaxed text-ink-2">
              {celebration === 1
                ? 'Your first line of four. Keep going — three lines unlocks a callout from the coordinator.'
                : celebration === 2
                  ? 'Two lines down. One more and you get the coordinator callout.'
                  : 'Find a coordinator and show them. Your team gets a callout at the spotlight reveal.'}
            </p>
            <button
              onClick={() => setCelebration(null)}
              className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-bg transition-colors hover:bg-accent-2"
            >
              Back to the floor →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
