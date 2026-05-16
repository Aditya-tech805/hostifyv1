'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { ParticipantSync } from '@/components/ParticipantSync';
import { ActivityHeader } from '@/components/ActivityHeader';
import { ToastProvider, useToast } from '@/components/Toast';
import { PITCH_STEPS } from '@/lib/activities';
import { readJSON, writeJSON, STORAGE_KEYS } from '@/lib/storage';

type PitchData = Record<string, string>;

export default function PitchLabPage() {
  return (
    <ToastProvider>
      <TopBar />
      <ParticipantSync />
      <main className="mx-auto max-w-[720px] px-5 pb-20 pt-6">
        <ActivityHeader
          step="Activity · Phase 2"
          title="Pitch Lab"
          description="Five questions that build into your 5-minute pitch. Answer in plain language — not corporate-speak. Auto-saves as you type. Carry this into Phase 3."
        />
        <PitchLabBody />
      </main>
    </ToastProvider>
  );
}

function PitchLabBody() {
  const { push: toast } = useToast();
  const [data, setData] = useState<PitchData>({});
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = readJSON<PitchData>(STORAGE_KEYS.pitchLab, {});
    setData(loaded);
    // Jump to first unanswered step, else summary
    const firstEmpty = PITCH_STEPS.findIndex((s) => !(loaded[s.id] || '').trim());
    setStep(firstEmpty === -1 ? PITCH_STEPS.length : firstEmpty);
    setHydrated(true);
  }, []);

  const update = (id: string, value: string) => {
    const next = { ...data, [id]: value };
    setData(next);
    writeJSON(STORAGE_KEYS.pitchLab, next);
  };

  const inSummary = step >= PITCH_STEPS.length;

  if (!hydrated) {
    return <div className="mt-6 h-[300px] rounded-3xl border border-line bg-surface" />;
  }

  return (
    <>
      {/* Progress dots */}
      <div className="my-[26px] flex gap-1.5">
        {PITCH_STEPS.map((s, i) => {
          const done = (data[s.id] || '').trim().length > 0;
          const active = i === step;
          return (
            <span
              key={s.id}
              className={`h-1 flex-1 rounded-full transition-colors ${
                active ? 'bg-primary' : done ? 'bg-accent' : 'bg-surface-2'
              }`}
            />
          );
        })}
        <span
          className={`h-1 flex-1 rounded-full transition-colors ${
            inSummary ? 'bg-primary' : 'bg-surface-2'
          }`}
        />
      </div>

      {!inSummary ? (
        <StepCard
          stepIdx={step}
          totalSteps={PITCH_STEPS.length}
          value={data[PITCH_STEPS[step].id] ?? ''}
          onChange={(v) => update(PITCH_STEPS[step].id, v)}
          onPrev={() => setStep((s) => Math.max(0, s - 1))}
          onNext={() => setStep((s) => s + 1)}
        />
      ) : (
        <SummaryView data={data} onEdit={() => setStep(0)} onCopy={() => {
          const text = PITCH_STEPS
            .map((s) => `${s.question}\n${(data[s.id] || '—').trim()}`)
            .join('\n\n');
          navigator.clipboard?.writeText(text);
          toast('Pitch copied to clipboard.');
        }} />
      )}
    </>
  );
}

function StepCard({
  stepIdx, totalSteps, value, onChange, onPrev, onNext,
}: {
  stepIdx: number;
  totalSteps: number;
  value: string;
  onChange: (v: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const s = PITCH_STEPS[stepIdx];
  return (
    <div className="rounded-3xl border border-line bg-surface p-7">
      <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-2">
        Step {stepIdx + 1} of {totalSteps}
      </div>
      <h3 className="mb-2 font-display text-[22px] font-semibold leading-tight tracking-tight">
        {s.question}
      </h3>
      <p className="mb-5 text-[13.5px] leading-relaxed text-ink-2">{s.hint}</p>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type here. Auto-saves."
        className="min-h-[100px] w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-[15px] leading-relaxed text-ink outline-none transition-colors focus:border-primary"
      />
      <div className="mt-1.5 text-right font-mono text-[11px] tracking-wider text-mute">
        {s.target}
      </div>
      <div className="mt-[18px] grid grid-cols-[100px_1fr] gap-2.5">
        <button
          onClick={onPrev}
          disabled={stepIdx === 0}
          className="rounded-xl border border-line bg-surface px-4 py-3.5 text-sm font-medium text-ink-2 transition-colors hover:border-primary hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Prev
        </button>
        <button
          onClick={onNext}
          className="rounded-xl border border-primary bg-primary px-5 py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-px hover:bg-primary-2"
        >
          {stepIdx === totalSteps - 1 ? 'Review pitch →' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

function SummaryView({
  data, onEdit, onCopy,
}: { data: PitchData; onEdit: () => void; onCopy: () => void }) {
  return (
    <>
      <div className="rounded-3xl border border-line bg-surface p-7">
        {PITCH_STEPS.map((s) => {
          const text = (data[s.id] || '').trim();
          return (
            <div key={s.id} className="border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0">
              <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-accent">
                {s.question}
              </div>
              <div className={`text-[15px] leading-relaxed ${text ? 'text-ink' : 'italic text-mute'}`}>
                {text || 'No answer yet.'}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-[18px] grid grid-cols-[100px_1fr] gap-2.5">
        <button onClick={onEdit} className="rounded-xl border border-line bg-surface px-4 py-3.5 text-sm font-medium text-ink-2 transition-colors hover:border-primary hover:text-ink">
          ← Edit
        </button>
        <button
          onClick={onCopy}
          className="rounded-xl border border-primary bg-primary px-5 py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-px hover:bg-primary-2"
        >
          Copy pitch as text
        </button>
      </div>
    </>
  );
}
