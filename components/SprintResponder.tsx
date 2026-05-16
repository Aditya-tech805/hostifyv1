'use client';

import { useEffect, useState } from 'react';
import { useSprint, useSprintSubmissions, submitSprintAnswer } from '@/lib/data';
import { readOwnTeam, type Team } from '@/lib/teams';
import { pad } from '@/lib/schedule';
import { useToast } from './Toast';

/**
 * Takeover banner on the participant view when a sprint is live. Shows
 * the prompt, the countdown, and a textarea to submit a one-line answer.
 * After the timer ends, shows "submission closed" with their last entry.
 */
export function SprintResponder() {
  const [sprint] = useSprint();
  const subs = useSprintSubmissions();
  const { push: toast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [draft, setDraft] = useState('');
  const [, setTick] = useState(0);

  useEffect(() => { setTeam(readOwnTeam()); }, []);
  useEffect(() => {
    if (!sprint) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [sprint]);

  if (!sprint || !team) return null;

  const now = Date.now();
  const remaining = Math.max(0, sprint.endsAt - now);
  const isOpen = remaining > 0;
  const totalSec = Math.ceil(remaining / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;

  const existing = subs.find((sub) => sub.teamId === team.id);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (text.length < 4) return;
    submitSprintAnswer({
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      text,
      submittedAt: Date.now(),
    });
    setDraft('');
    toast(existing ? 'Updated your sprint answer.' : 'Sprint answer submitted.');
  };

  return (
    <section className="my-4 border-y border-spark/30 bg-spark/[0.06]">
      <div className="mx-auto max-w-[720px] px-5 py-5">
        <div className="mb-2 flex items-center justify-between gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-spark">
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-spark" />
          Speed Idea Sprint
        </span>
        {isOpen ? (
          <span className="text-spark">{pad(m)}:{pad(s)} left</span>
        ) : (
          <span className="text-mute">Closed</span>
        )}
      </div>
      <h3 className="font-display text-[20px] font-semibold leading-tight tracking-tight">
        {sprint.prompt}
      </h3>

      {isOpen ? (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={200}
            placeholder={existing ? `Currently: "${existing.text}"  — type to overwrite` : 'Your one-line idea…'}
            className="min-h-[88px] w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition-colors focus:border-spark"
          />
          <button
            type="submit"
            disabled={draft.trim().length < 4}
            className="w-full rounded-xl bg-spark px-4 py-3 text-[14px] font-semibold text-white shadow-[0_6px_24px_-10px_rgba(245,158,11,0.45)] transition-all hover:-translate-y-px hover:bg-[#FBBF24] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute disabled:shadow-none"
          >
            {existing ? 'Update submission →' : 'Submit →'}
          </button>
        </form>
      ) : (
        <div className="mt-3 rounded-xl border border-line bg-surface px-4 py-3 text-[13.5px] leading-relaxed">
          {existing ? (
            <>
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                Your submission
              </div>
              <div className="text-ink">{existing.text}</div>
            </>
          ) : (
            <div className="text-mute">Time&apos;s up — no submission from your team.</div>
          )}
        </div>
      )}
      </div>
    </section>
  );
}
