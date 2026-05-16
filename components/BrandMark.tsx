interface BrandMarkProps {
  /** Stroke colour for the asterisk burst. Defaults to brand primary (violet). */
  stroke?: string;
  /** Centre dot colour. Defaults to brand accent (lime). */
  dot?: string;
  /** Size in px. */
  size?: number;
  /** Whether the mark slowly rotates. */
  animate?: boolean;
}

/**
 * INNOVATRIX asterisk-burst mark — 8 rays radiating from a small centre dot.
 * Used in every page's topbar and the projector screen.
 */
export function BrandMark({
  stroke = '#7c3aed',
  dot = '#84cc16',
  size = 22,
  animate = true,
}: BrandMarkProps) {
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
        <g stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
          <line x1="11"  y1="2.5"  x2="11"  y2="9" />
          <line x1="11"  y1="13"   x2="11"  y2="19.5" />
          <line x1="2.5" y1="11"   x2="9"   y2="11" />
          <line x1="13"  y1="11"   x2="19.5" y2="11" />
          <line x1="4.8" y1="4.8"  x2="8.6"  y2="8.6" />
          <line x1="13.4" y1="13.4" x2="17.2" y2="17.2" />
          <line x1="17.2" y1="4.8"  x2="13.4" y2="8.6" />
          <line x1="8.6"  y1="13.4" x2="4.8"  y2="17.2" />
        </g>
        <circle cx="11" cy="11" r="1.6" fill={dot} />
      </svg>
    </span>
  );
}
