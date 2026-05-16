'use client';

import { useEffect, useState } from 'react';
import { usePoll, submitPollWord, usePollSubmissions } from '@/lib/data';
import { readString, writeString } from '@/lib/storage';
import { useToast } from './Toast';

const DEVICE_ID_KEY = 'innovatrix26.device-id';

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = readString(DEVICE_ID_KEY);
  if (!id) {
    id = 'dev-' + crypto.randomUUID().slice(0, 8);
    writeString(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * Inline banner shown on the participant view when a poll is active.
 * Lets them submit one word to the cloud. Renders nothing otherwise.
 */
export function PollResponder() {
  const [poll] = usePoll();
  const subs = usePollSubmissions();
  const { push: toast } = useToast();
  const [word, setWord] = useState('');
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  if (!poll || !deviceId) return null;

  const already = !!subs[deviceId];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = word.trim().slice(0, 24);
    if (!w) return;
    submitPollWord(deviceId, w);
    setWord('');
    toast('Added to the word cloud.');
  };

  return (
    <section className="my-6 rounded-2xl border border-accent/40 bg-accent/[0.06] p-5">
      <div className="mb-2 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-accent">
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
        Live poll
      </div>
      <h3 className="font-display text-[20px] font-semibold leading-tight tracking-tight">
        {poll.question}
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
        One word. Pops up on the big screen instantly. You can change yours by submitting again.
      </p>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          maxLength={24}
          placeholder={already ? 'Submit again to change your word' : 'Your one word…'}
          className="flex-1 rounded-xl border border-line bg-surface-2 px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-accent"
        />
        <button
          type="submit"
          disabled={!word.trim()}
          className="rounded-xl bg-accent px-4 py-3 text-[14px] font-semibold text-bg transition-colors hover:bg-accent-2 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute"
        >
          Add →
        </button>
      </form>
      {already && (
        <div className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
          You already added: <span className="normal-case tracking-normal text-accent">{subs[deviceId]}</span>
        </div>
      )}
    </section>
  );
}
