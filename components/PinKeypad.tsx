'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrandMark } from './BrandMark';

interface PinKeypadProps {
  /** "Coordinator Access" / "Judge Access" — shown as a pill above the title. */
  role: string;
  /** Pill tone — primary (violet) for coordinator, accent (lime) for judges. */
  roleTone: 'primary' | 'accent';
  /** Title shown above the keypad. */
  title?: string;
  /** Subtitle shown below the title. */
  subtitle?: string;
  /** The correct 6-digit PIN to compare against. */
  correctPin: string;
  /** Called when the correct PIN is entered. */
  onSuccess: () => void;
  /** Optional "back to participant" link at the bottom. */
  backHref?: string;
}

/**
 * Re-usable 6-digit PIN entry screen with shake-on-wrong, haptic vibration,
 * keyboard support (digits + Backspace + Esc), and 3-strike cooldown.
 */
export function PinKeypad({
  role,
  roleTone,
  title = 'Enter PIN',
  subtitle,
  correctPin,
  onSuccess,
  backHref,
}: PinKeypadProps) {
  const [buffer, setBuffer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [errorPulse, setErrorPulse] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const submitting = useRef(false);

  const trySubmit = useCallback((pin: string) => {
    if (submitting.current) return;
    submitting.current = true;
    if (pin === correctPin) {
      onSuccess();
    } else {
      setErrorPulse(true);
      setAttempts((a) => a + 1);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.([60, 30, 60]);
      window.setTimeout(() => { setBuffer(''); setErrorPulse(false); submitting.current = false; }, 500);
    }
    submitting.current = false;
  }, [correctPin, onSuccess]);

  // Cooldown effect after 3 wrong attempts
  useEffect(() => {
    if (attempts >= 3) setCooldown(30);
  }, [attempts]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { setAttempts(0); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (cooldown > 0) return;
      if (/^[0-9]$/.test(e.key) && buffer.length < 6) {
        const next = buffer + e.key;
        setBuffer(next);
        if (next.length === 6) window.setTimeout(() => trySubmit(next), 150);
      } else if (e.key === 'Backspace') {
        setBuffer((b) => b.slice(0, -1));
      } else if (e.key === 'Escape') {
        setBuffer('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [buffer, cooldown, trySubmit]);

  const press = (d: string) => {
    if (cooldown > 0) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(8);
    if (d === 'clear') return setBuffer('');
    if (d === 'back')  return setBuffer((b) => b.slice(0, -1));
    if (buffer.length >= 6) return;
    const next = buffer + d;
    setBuffer(next);
    if (next.length === 6) window.setTimeout(() => trySubmit(next), 150);
  };

  const dotFillClass = roleTone === 'accent' ? 'bg-accent border-accent' : 'bg-primary border-primary';
  const rolePillClass =
    roleTone === 'accent'
      ? 'border-accent/40 bg-accent/[0.08] text-accent'
      : 'border-primary/40 bg-primary/[0.10] text-primary-2';
  const markStroke = roleTone === 'accent' ? '#84cc16' : '#7c3aed';
  const markDot    = roleTone === 'accent' ? '#7c3aed' : '#84cc16';

  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="mb-3 flex items-center gap-2.5 font-display text-lg font-semibold">
        <BrandMark stroke={markStroke} dot={markDot} size={24} />
        <span>INNOVATRIX</span>
      </div>
      <div className={`mb-9 rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] ${rolePillClass}`}>
        {role}
      </div>
      <h1 className="mb-2 text-center font-display text-[28px] font-semibold tracking-tight">{title}</h1>
      {subtitle && (
        <p className="mb-9 max-w-[320px] text-center text-sm text-mute">{subtitle}</p>
      )}

      <div className={`mb-9 flex gap-3.5 ${errorPulse ? 'animate-shake' : ''}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
              errorPulse
                ? 'border-danger bg-danger'
                : i < buffer.length
                  ? dotFillClass
                  : 'border-line-2 bg-transparent'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        {['1','2','3','4','5','6','7','8','9','clear','0','back'].map((d) => {
          const isFn = d === 'clear' || d === 'back';
          return (
            <button
              key={d}
              onClick={() => press(d)}
              disabled={cooldown > 0}
              className={`flex h-20 w-20 select-none items-center justify-center rounded-full border font-display text-[26px] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-30 ${
                isFn
                  ? 'border-transparent bg-transparent text-[18px] text-mute hover:text-ink'
                  : 'border-line bg-surface text-ink hover:border-line-2 hover:bg-surface-2 active:scale-95 ' +
                    (roleTone === 'accent' ? 'active:bg-accent active:border-accent active:text-bg' : 'active:bg-primary active:border-primary')
              }`}
            >
              {d === 'back' ? '←' : d}
            </button>
          );
        })}
      </div>

      {cooldown > 0 && (
        <div className="mt-6 font-mono text-xs uppercase tracking-[0.1em] text-danger">
          Locked · try again in {cooldown}s
        </div>
      )}

      {backHref && (
        <a
          href={backHref}
          className="mt-8 font-mono text-xs uppercase tracking-[0.12em] text-mute transition-colors hover:text-ink-2"
        >
          ← Back to participant view
        </a>
      )}
    </section>
  );
}
