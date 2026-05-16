interface BrandMarkProps {
  /** Stroke colour for the asterisk burst. Defaults to brand primary (indigo). */
  stroke?: string;
  /** Centre dot colour. Defaults to brand accent (cyan). */
  dot?: string;
  /** Size in px. */
  size?: number;
  /** Whether the mark slowly rotates. */
  animate?: boolean;
  /**
   * If true, fills the mark area with a brand gradient backplate (rounded
   * square) and the rays/dot become contrast colours. Used in the topbar
   * for a more premium "logo block" feel.
   */
  filled?: boolean;
}

/**
 * INNOVATRIX asterisk-burst mark — 8 rays radiating from a small centre dot.
 * Two variants: outline (default) and filled (with gradient backplate).
 */
export function BrandMark({
  stroke,
  dot,
  size = 22,
  animate = true,
  filled = false,
}: BrandMarkProps) {
  const rayColor = stroke ?? (filled ? '#FFFFFF' : '#4F46E5');
  const dotColor = dot ?? (filled ? '#06B6D4' : '#7C3AED');

  return (
    <span
      className="inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 22 22"
        fill="none"
        className={animate ? 'h-full w-full animate-spin-slow' : 'h-full w-full'}
      >
        {filled && (
          <>
            <defs>
              <linearGradient id="bm-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>
            </defs>
            <rect width="22" height="22" rx="5" fill="url(#bm-grad)" />
          </>
        )}
        <g stroke={rayColor} strokeWidth="1.8" strokeLinecap="round">
          <line x1="11"  y1="2.5"  x2="11"  y2="9" />
          <line x1="11"  y1="13"   x2="11"  y2="19.5" />
          <line x1="2.5" y1="11"   x2="9"   y2="11" />
          <line x1="13"  y1="11"   x2="19.5" y2="11" />
          <line x1="4.8" y1="4.8"  x2="8.6"  y2="8.6" />
          <line x1="13.4" y1="13.4" x2="17.2" y2="17.2" />
          <line x1="17.2" y1="4.8"  x2="13.4" y2="8.6" />
          <line x1="8.6"  y1="13.4" x2="4.8"  y2="17.2" />
        </g>
        <circle cx="11" cy="11" r="1.6" fill={dotColor} />
      </svg>
    </span>
  );
}
