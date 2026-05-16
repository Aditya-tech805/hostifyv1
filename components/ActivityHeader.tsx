'use client';

import Link from 'next/link';

interface ActivityHeaderProps {
  step: string;
  title: string;
  description: string;
}

/** Common header for every activity page — back button + step label + title + blurb. */
export function ActivityHeader({ step, title, description }: ActivityHeaderProps) {
  return (
    <>
      <Link
        href="/"
        className="mb-[18px] inline-flex items-center gap-1.5 rounded-full border border-line bg-transparent px-3.5 py-2 text-[13px] text-ink-2 transition-colors hover:border-primary hover:text-primary-2"
      >
        ← Back to activities
      </Link>
      <div>
        <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-accent">
          {step}
        </div>
        <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tight">
          {title}
        </h2>
        <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">{description}</p>
      </div>
    </>
  );
}
