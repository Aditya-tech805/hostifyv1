import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = "INNOVATRIX '26 · Innovation Showcase";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Open Graph image — bright premium preview for social shares.
 * Mesh gradient backdrop, indigo→violet→cyan blob layering, dark slate text.
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
            'radial-gradient(ellipse 60% 60% at 18% 25%, rgba(79, 70, 229, 0.35) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 82% 80%, rgba(6, 182, 212, 0.30) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 60% 10%, rgba(124, 58, 237, 0.25) 0%, transparent 60%), #F8FAFC',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Eyebrow pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 24px',
            border: '1px solid rgba(79, 70, 229, 0.35)',
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: 999,
            color: '#4F46E5',
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
            color: '#0F172A',
            display: 'flex',
          }}
        >
          INNOVATRI
          <span
            style={{
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED, #06B6D4)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >X</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            color: '#334155',
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
            marginTop: 64,
            fontSize: 26,
            color: '#4F46E5',
            letterSpacing: 8,
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            fontWeight: 600,
          }}
        >
          <span>18 May 2026</span>
          <span style={{ color: '#06B6D4', margin: '0 18px' }}>·</span>
          <span>10 AM – 4 PM IST</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
