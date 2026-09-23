import { EVENT, PLATFORM, EVENT_DATE_LONG, DOORS_TIME, WRAP_TIME, capitalize, numberWord, to12h } from '@/config/event';
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
// `||` rather than `??`: a variable added but left blank (e.g. copied from
// .env.example) arrives as "" and would make `new URL()` throw at build time.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${EVENT.name} · ${EVENT.kind}`,
  description:
    `A live ${EVENT.kind.toLowerCase()} for ${numberWord(EVENT.expectedTeams)} teams. ${EVENT_DATE_LONG} · ${to12h(DOORS_TIME)} – ${to12h(WRAP_TIME)} ${EVENT.tzLabel}. Powered by ${PLATFORM.name}.`,
  applicationName: PLATFORM.name,
  openGraph: {
    title: EVENT.name,
    description: `${capitalize(numberWord(EVENT.expectedTeams))} teams. ${EVENT.durationLabel}. ${EVENT.tagline}`,
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
