'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { ActivityHeader } from '@/components/ActivityHeader';
import { ToastProvider, useToast } from '@/components/Toast';
import { IDEA_PROMPTS } from '@/lib/activities';
import { readJSON, writeJSON, STORAGE_KEYS } from '@/lib/storage';

interface DrawHistoryItem {
  prompt: string;
  answer: string;
  ts: number;
}

export default function IdeaCardsPage() {
  return (
    <ToastProvider>
      <TopBar />
      <main className="mx-auto max-w-[720px] px-5 pb-20 pt-6">
        <ActivityHeader
          step="Activity · Phase 2"
          title="Idea Card Roulette"
          description="Tap a card to draw a random prompt. Discuss with your team for two minutes, jot a one-line answer, and draw the next. Sharpens your pitch in the background while you build."
        />
        <IdeaCardsBody />
      </main>
    </ToastProvider>
  );
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function IdeaCardsBody() {
  const { push: toast } = useToast();

  // Drawn-index queue (refilled on exhaust) + current prompt index
  const [queue, setQueue] = useState<number[]>(() => shuffle(IDEA_PROMPTS.map((_, i) => i)));
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [drawCount, setDrawCount] = useState(0);
  const [answer, setAnswer] = useState('');
  const [flipping, setFlipping] = useState(false);
  const [history, setHistory] = useState<DrawHistoryItem[]>([]);

  // Hydrate history on mount
  useEffect(() => {
    setHistory(readJSON<DrawHistoryItem[]>(STORAGE_KEYS.ideaCards, []));
  }, []);

  const currentPrompt = useMemo(
    () => (currentIdx != null ? IDEA_PROMPTS[currentIdx] : null),
    [currentIdx],
  );

  const draw = () => {
    setFlipping(true);
    setTimeout(() => {
      setQueue((q) => {
        const refill = q.length === 0;
        if (refill) toast('Reshuffling the deck.');
        const nextQueue = refill ? shuffle(IDEA_PROMPTS.map((_, i) => i)) : q;
        const [head, ...rest] = nextQueue;
        setCurrentIdx(head);
        setDrawCount((c) => c + 1);
        setAnswer('');
        setFlipping(false);
        return rest;
      });
    }, 350);
  };

  const saveAnswer = () => {
    if (currentIdx == null) return;
    const trimmed = answer.trim();
    const next = [...history];
    const last = next[next.length - 1];
    const prompt = IDEA_PROMPTS[currentIdx];
    if (last && last.prompt === prompt) {
      next[next.length - 1] = { ...last, answer: trimmed, ts: Date.now() };
    } else {
      next.push({ prompt, answer: trimmed, ts: Date.now() });
    }
    setHistory(next);
    writeJSON(STORAGE_KEYS.ideaCards, next);
  };

  const drawNext = () => {
    saveAnswer();
    draw();
  };

  return (
    <>
      <div className="mt-6 [perspective:1200px]">
        <button
          type="button"
          onClick={currentPrompt ? undefined : draw}
          className={`relative flex min-h-[280px] w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-line-2 bg-gradient-to-br from-surface to-surface-2 p-9 text-center transition-all duration-500 ${
            !currentPrompt ? 'cursor-pointer hover:-translate-y-0.5 hover:border-primary' : 'cursor-default'
          } ${flipping ? '[transform:rotateY(90deg)] opacity-0' : ''}`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 0% 0%, rgba(124,58,237,0.18) 0, transparent 50%), radial-gradient(circle at 100% 100%, rgba(132,204,22,0.10) 0, transparent 50%)',
            }}
          />
          {currentPrompt ? (
            <>
              <div className="absolute right-[22px] top-[18px] font-mono text-[10px] uppercase tracking-[0.18em] text-mute">
                Card {String(drawCount).padStart(2, '0')} / {IDEA_PROMPTS.length}
              </div>
              <div className="relative mb-5 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-2">
                Prompt
              </div>
              <div className="relative max-w-[480px] font-display text-2xl font-medium leading-snug tracking-tight text-ink">
                {currentPrompt}
              </div>
            </>
          ) : (
            <>
              <div className="relative mb-5 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-2">
                Card 0 · ready to draw
              </div>
              <div className="relative font-display text-2xl font-medium leading-snug tracking-tight text-ink">
                Tap to draw your first prompt.
              </div>
              <div className="relative mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-mute">
                Draw →
              </div>
            </>
          )}
        </button>
      </div>

      {currentPrompt && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              onClick={draw}
              className="rounded-xl border border-line bg-surface px-4 py-3 text-[13px] font-medium text-ink-2 transition-colors hover:border-primary hover:text-ink"
            >
              Skip
            </button>
            <button
              onClick={drawNext}
              className="rounded-xl border border-primary bg-primary px-4 py-3 text-[13px] font-semibold text-ink shadow-[0_6px_24px_-10px_rgba(124,58,237,0.5)] transition-colors hover:bg-primary-2"
            >
              Draw another
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-surface p-[18px]">
            <label className="mb-2 block font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">
              Your team&apos;s quick answer
              <span className="ml-2 font-sans text-xs normal-case tracking-normal text-mute">
                — saved locally to this device
              </span>
            </label>
            <textarea
              maxLength={240}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onBlur={saveAnswer}
              placeholder="One sentence is enough. Be specific."
              className="min-h-[80px] w-full resize-none rounded-[10px] border border-line bg-surface-2 px-3.5 py-3 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-mute focus:border-primary"
            />
          </div>
        </>
      )}

      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-mute">
            Your team&apos;s draws
          </h3>
          <div className="space-y-2">
            {history.slice().reverse().map((h) => (
              <div key={h.ts} className="rounded-xl border border-line bg-surface px-4 py-3.5">
                <div className="mb-1.5 font-display text-sm font-medium text-ink">{h.prompt}</div>
                <div
                  className={`border-l-2 pl-3 text-[13px] leading-snug ${
                    h.answer ? 'border-accent text-ink-2' : 'border-line italic text-mute'
                  }`}
                >
                  {h.answer || 'No answer yet.'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
