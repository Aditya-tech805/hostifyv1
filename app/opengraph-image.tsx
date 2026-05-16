import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = "INNOVATRIX '26 · Innovation Showcase";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Open Graph image — dark editorial preview for social shares.
 * Mesh gradient over near-black, brand glow accents, cream wordmark.
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
            'radial-gradient(ellipse 60% 60% at 18% 25%, rgba(99, 102, 241, 0.45) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 82% 80%, rgba(34, 211, 238, 0.35) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 60% 10%, rgba(167, 139, 250, 0.30) 0%, transparent 60%), #0A0B14',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Eyebrow pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 24px',
            border: '1px solid rgba(99, 102, 241, 0.5)',
            background: 'rgba(20, 21, 31, 0.7)',
            borderRadius: 999,
            color: '#A5B4FC',
            fontSize: 22,
            letterSpacing: 6,
            textTransform: 'uppercase',
            marginBottom: 36,
            fontWeight: 600,
          }}
        >
          ✱  Innovation Showcase Experience
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 180,
            fontWeight: 800,
            letterSpacing: -8,
            lineHeight: 0.95,
            color: '#F5F3EE',
            display: 'flex',
          }}
        >
          INNOVATRI
          <span
            style={{
              background: 'linear-gradient(135deg, #6366F1, #A78BFA, #22D3EE)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >X</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            color: '#CBD5E1',
            marginTop: 28,
            maxWidth: 920,
            lineHeight: 1.3,
          }}>
          Twenty-four teams. Six hours. Powerful ideas and the future you can build.
        </div>

        {/* Event details strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 64,
            fontSize: 26,
            color: '#A5B4FC',
            letterSpacing: 8,
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            fontWeight: 600,
          }}
        >
          <span>18 May 2026</span>
          <span style={{ color: '#22D3EE', margin: '0 18px' }}>·</span>
          <span>10 AM – 4 PM IST</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
