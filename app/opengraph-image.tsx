import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = "INNOVATRIX '26 · Innovation Showcase";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Open Graph image — what shows up when the URL is shared on WhatsApp,
 * Twitter, LinkedIn, etc. Rendered at build time via Edge runtime.
 */
export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          background:
            'radial-gradient(ellipse 60% 60% at 25% 30%, rgba(124,58,237,0.30) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 80% 90%, rgba(132,204,22,0.18) 0%, transparent 60%), #0a0a0f',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 22px',
            border: '1px solid rgba(132,204,22,0.35)',
            background: 'rgba(132,204,22,0.10)',
            borderRadius: 999,
            color: '#84cc16',
            fontSize: 22,
            letterSpacing: 6,
            textTransform: 'uppercase',
            marginBottom: 32,
          }}
        >
          Innovation Showcase Experience
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 180,
            fontWeight: 800,
            letterSpacing: -8,
            lineHeight: 0.95,
            color: '#f5f3ee',
            display: 'flex',
          }}
        >
          INNOVATRI<span style={{ color: '#7c3aed' }}>X</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            color: '#d4d4d8',
            marginTop: 28,
            maxWidth: 920,
            lineHeight: 1.3,
          }}>
          Sixteen teams. Six hours. Powerful ideas and the future you can build.
        </div>

        {/* Event details strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 60,
            fontSize: 26,
            color: '#a78bfa',
            letterSpacing: 8,
            textTransform: 'uppercase',
            fontFamily: 'monospace',
          }}
        >
          <span>18 May 2026</span>
          <span style={{ color: '#7c3aed', margin: '0 18px' }}>·</span>
          <span>10 AM – 4 PM IST</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
