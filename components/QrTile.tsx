'use client';

// QR rendering for the projector. Generates an SVG data URL at runtime
// via `qrcode` (no external HTTP dependency - the projector will work
// even without internet once the page has loaded). The same component
// is used for the small persistent QR in the KPI strip and the giant
// QR on the "Scan to Join" carousel slide; the parent controls size.

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrTileProps {
  /** The URL to encode. */
  value: string;
  /** Pixel size (square). The QR scales to fit this box. */
  size: number;
  /** Foreground (dark modules) hex. Default cream so it reads on dark bg. */
  fg?: string;
  /** Background hex. Default transparent surface. */
  bg?: string;
  className?: string;
}

export function QrTile({ value, size, fg = '#F5F3EE', bg = '#14151F', className = '' }: QrTileProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size * 2, // render at 2x for crisp upscaling on the projector
      color: { dark: fg, light: bg },
    })
      .then((url) => { if (!cancelled) setDataUrl(url); })
      .catch(() => { if (!cancelled) setDataUrl(null); });
    return () => { cancelled = true; };
  }, [value, size, fg, bg]);

  if (!dataUrl) {
    // Placeholder while encoding - same footprint so layout doesn't jump.
    return (
      <div
        className={`rounded-lg border border-line-2 ${className}`}
        style={{ width: size, height: size, background: bg }}
        aria-label="QR code loading"
      />
    );
  }

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt={`QR code · ${value}`}
      className={`rounded-lg ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
