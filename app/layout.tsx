import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono, Fraunces } from 'next/font/google';
import './globals.css';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

// Editorial serif — used sparingly for italic accent words against the bold
// display sans. The single character of contrast is what makes the page feel
// hand-set instead of template-generated.
const serif = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  style: ['italic', 'normal'],
  weight: ['300', '400', '500'],
});

// Resolve the public base URL for OG images / canonical links. Vercel injects
// these env vars on every deploy. Falls back to localhost in plain dev.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "INNOVATRIX '26 · Innovation Showcase",
  description:
    'A live innovation experience for twenty-four teams. 18 May 2026 · 10 AM – 4 PM IST.',
  openGraph: {
    title: "INNOVATRIX '26",
    description: 'Twenty-four teams. Six hours. Innovation, creativity, and the future you can build.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0B14',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable} ${serif.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
