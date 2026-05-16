'use client';

import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ClientOnly } from '@/components/ClientOnly';

/**
 * Standalone QR code page — open this on a laptop, project / print it
 * for the registration desk. The QR encodes the site's root URL, so
 * participants who scan it land directly on the participant view.
 *
 * Customize: append ?url=https://something to override the encoded URL.
 */
export default function QRPage() {
  return (
    <ClientOnly fallback={null}>
      <QRBody />
    </ClientOnly>
  );
}

function QRBody() {
  const [origin, setOrigin] = useState<string>('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const override = params.get('url');
    setOrigin(override ?? window.location.origin);
  }, []);

  // qr-server.com generates a QR PNG with no auth required. Free, used by
  // many open-source projects. Falls back to a Google Charts QR if needed.
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=640x640&qzone=2&margin=0&color=0a0a0f&bgcolor=ffffff&data=${encodeURIComponent(origin)}`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg p-6 print:bg-white print:p-0">

      <div className="flex items-center gap-3 font-display text-2xl font-semibold tracking-tight text-ink print:hidden">
        <BrandMark size={28} />
        <span>INNOVATRIX</span>
        <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[12px] tracking-[0.18em] text-mute">
          &apos;26
        </span>
      </div>

      <h1 className="mt-8 text-center font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl print:mt-12 print:text-black">
        Scan to enter the experience
      </h1>

      <p className="mt-3 text-center text-mute print:text-gray-600">
        Twenty-four teams · Six hours · 18 May 2026 · 10 AM – 4 PM
      </p>

      <div className="mt-10 rounded-3xl bg-white p-8 shadow-2xl print:mt-8 print:shadow-none">
        {origin ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrSrc}
            alt={`QR code for ${origin}`}
            width={480}
            height={480}
            className="block h-[420px] w-[420px] sm:h-[480px] sm:w-[480px]"
          />
        ) : (
          <div className="flex h-[420px] w-[420px] items-center justify-center font-mono text-sm text-gray-400 sm:h-[480px] sm:w-[480px]">
            Loading…
          </div>
        )}
      </div>

      <div className="mt-8 max-w-[640px] text-center print:hidden">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-mute">
          Encodes
        </div>
        <div className="mt-1 break-all font-mono text-sm text-ink-2">
          {origin || '···'}
        </div>
      </div>

      <button
        onClick={() => window.print()}
        className="mt-10 rounded-full border border-line-2 bg-surface px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2 transition-colors hover:border-accent hover:text-accent print:hidden"
      >
        🖨  Print this page
      </button>

      <p className="mt-4 max-w-[480px] text-center font-mono text-[11px] uppercase tracking-[0.14em] text-mute print:hidden">
        Tip: pass a different URL via <code className="text-accent">?url=…</code> to encode something else
      </p>
    </main>
  );
}
