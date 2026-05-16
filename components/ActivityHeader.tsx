'use client';

import Link from 'next/link';

interface ActivityHeaderProps {
  step: string;
  title: string;
  description: string;
}

export function ActivityHeader({ step, title, description }: ActivityHeaderProps) {
  return (
    <>
      <Link
        href="/"
        className="mb-[18px] inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] text-ink-2 shadow-soft transition-colors hover:border-primary hover:text-primary"
      >
        ← Back to activities
      </Link>
      <div>
        <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-primary">
          {step}
        </div>
        <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-ink">
          {title}
        </h2>
        <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">{description}</p>
      </div>
    </>
  );
}
