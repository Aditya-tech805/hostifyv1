'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Photo booth — 6 frame templates with a flip-between-templates UX.
//
// Flow: capture ONE raw square frame from the camera, cache it, then compose
// the chosen template overlay on top whenever the user picks a different one.
// No re-capture needed to try a different look — saves friction and battery.
//
// All output is 1080×1080 JPEG so the gallery grid stays uniform regardless
// of template chosen.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { ActivityHeader } from '@/components/ActivityHeader';
import { ToastProvider, useToast } from '@/components/Toast';
import { useGallery, uploadGalleryPhoto, deleteGalleryPhoto, type Photo } from '@/lib/data';
import { readOwnTeam, type Team } from '@/lib/teams';
import { readString, STORAGE_KEYS } from '@/lib/storage';

const OUTPUT_SIZE = 1080;

// ─── Page shell ──────────────────────────────────────────────────────────────

export default function BoothPage() {
  return (
    <ToastProvider>
      <TopBar />
      <main className="mx-auto max-w-[960px] px-5 pb-20 pt-6">
        <ActivityHeader
          step="Activity · All day"
          title="Photo Booth"
          description="Pick a template, take one shot, flip between six different looks — Marquee, Polaroid, Pass, Cover, Neon, Minimal — until you find the one to share. Save it to your phone or send it to the room gallery."
        />
        <BoothBody />
      </main>
    </ToastProvider>
  );
}

function BoothBody() {
  const [team, setTeam] = useState<Team | null>(null);
  useEffect(() => { setTeam(readOwnTeam()); }, []);

  if (!team) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-line-2 bg-surface p-10 text-center">
        <p className="text-ink-2 text-[15px] leading-relaxed">
          Register your team first — every template uses your team name.
          <br />
          <a href="/" className="mt-3 inline-block font-mono text-[12px] uppercase tracking-[0.16em] text-accent">
            ← Back to register
          </a>
        </p>
      </div>
    );
  }

  return (
    <>
      <Booth team={team} />
      <Gallery currentTeamId={team.id} />
    </>
  );
}

// ─── Template definitions ────────────────────────────────────────────────────

type TemplateId = 'marquee' | 'polaroid' | 'pass' | 'cover' | 'neon' | 'minimal';

interface FrameTemplate {
  id: TemplateId;
  name: string;
  sub: string;
  /** Background fill drawn before the photo. Default: black. */
  bg?: string;
  /** Photo rectangle as a fraction of canvas size. Default: full bleed. */
  photoRect?: { x: number; y: number; w: number; h: number };
  /** Whether the photo area should have a soft drop shadow (polaroid). */
  photoShadow?: boolean;
  /** Draw the foreground overlay (called AFTER the photo is placed). */
  drawOverlay: (ctx: CanvasRenderingContext2D, size: number, team: Team, fonts: FontFamilies) => void;
  /** Live React preview matching the canvas overlay — shown over the video feed. */
  Preview: React.FC<{ team: Team }>;
  /** Tiny thumb shown inside the template picker chip. */
  Thumb: React.FC<{ team: Team }>;
}

interface FontFamilies {
  display: string;  // Space Grotesk
  mono: string;     // JetBrains Mono
  serif: string;    // Fraunces
}

function readFontFamilies(): FontFamilies {
  if (typeof window === 'undefined') {
    return { display: 'sans-serif', mono: 'monospace', serif: 'serif' };
  }
  const cs = getComputedStyle(document.documentElement);
  // next/font sets --font-display etc. to a generated family name
  const display = cs.getPropertyValue('--font-display').trim() || 'Space Grotesk';
  const mono    = cs.getPropertyValue('--font-mono').trim()    || 'JetBrains Mono';
  const serif   = cs.getPropertyValue('--font-serif').trim()   || 'Fraunces';
  return {
    display: `${display}, "Space Grotesk", system-ui, sans-serif`,
    mono:    `${mono}, "JetBrains Mono", ui-monospace, monospace`,
    serif:   `${serif}, "Fraunces", Georgia, serif`,
  };
}

// ─── Canvas drawing helpers ──────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Template 1: Marquee (default — brand gradient bar) ─────────────────────

const drawMarquee: FrameTemplate['drawOverlay'] = (ctx, size, team, fonts) => {
  // Bottom gradient bar
  const barHeight = Math.round(size * 0.14);
  const grad = ctx.createLinearGradient(0, size - barHeight, size, size);
  grad.addColorStop(0,    '#6366F1');
  grad.addColorStop(0.55, '#A78BFA');
  grad.addColorStop(1,    '#22D3EE');
  ctx.fillStyle = grad;
  ctx.fillRect(0, size - barHeight, size, barHeight);

  // INNOVATRIX wordmark
  const padX = Math.round(size * 0.045);
  ctx.fillStyle = '#FFFFFF';
  const titleSize = Math.round(size * 0.052);
  ctx.font = `bold ${titleSize}px ${fonts.display}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(`INNOVATRIX '26`, padX, size - barHeight + Math.round(barHeight * 0.18));

  // Team / date sub-line
  const subSize = Math.round(size * 0.026);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.font = `${subSize}px ${fonts.mono}`;
  ctx.fillText(`TEAM ${team.name.toUpperCase()} · 18 MAY 2026`, padX, size - barHeight + Math.round(barHeight * 0.62));

  // Top-right team-color asterisk badge
  const badgeR = Math.round(size * 0.048);
  const badgeX = size - padX - badgeR;
  const badgeY = padX + badgeR;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = team.color;
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.round(badgeR * 1.6)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✱', badgeX, badgeY + 2);
};

// ─── Template 2: Polaroid (cream frame + serif caption) ──────────────────────

const drawPolaroid: FrameTemplate['drawOverlay'] = (ctx, size, team, fonts) => {
  // Soft photo shadow already drawn by compose. Just draw caption below photo.
  const photoBottom = Math.round(size * (0.06 + 0.76));  // matches photoRect h+y below

  // Team name in Fraunces italic, centered
  const nameY = photoBottom + Math.round(size * 0.045);
  const nameSize = Math.round(size * 0.066);
  ctx.fillStyle = '#0F172A';
  ctx.font = `italic 500 ${nameSize}px ${fonts.serif}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(team.name, size / 2, nameY);

  // Mono sub-line
  const subSize = Math.round(size * 0.022);
  ctx.fillStyle = '#64748B';
  ctx.font = `${subSize}px ${fonts.mono}`;
  ctx.fillText(`INNOVATRIX '26  ·  18 MAY 2026`, size / 2, nameY + Math.round(nameSize * 1.35));
};

// ─── Template 3: Pass (backstage event laminate) ─────────────────────────────

const drawPass: FrameTemplate['drawOverlay'] = (ctx, size, team, fonts) => {
  const padX = Math.round(size * 0.045);

  // Top dark band with holographic accent line
  const topH = Math.round(size * 0.075);
  ctx.fillStyle = 'rgba(10, 11, 20, 0.92)';
  ctx.fillRect(0, 0, size, topH);
  // Holographic gradient strip
  const stripH = Math.max(3, Math.round(size * 0.004));
  const strip = ctx.createLinearGradient(0, topH, size, topH);
  strip.addColorStop(0,   '#22D3EE');
  strip.addColorStop(0.5, '#A78BFA');
  strip.addColorStop(1,   '#22D3EE');
  ctx.fillStyle = strip;
  ctx.fillRect(0, topH, size, stripH);

  // Top-bar text
  ctx.fillStyle = '#F5F3EE';
  const topFont = Math.round(size * 0.022);
  ctx.font = `bold ${topFont}px ${fonts.mono}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('✱  ACCESS · ALL AREAS', padX, topH / 2);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(`PASS №  ${shortId(team.id).toUpperCase()}`, size - padX, topH / 2);

  // Bottom dark band
  const botH = Math.round(size * 0.22);
  const botY = size - botH;
  ctx.fillStyle = 'rgba(10, 11, 20, 0.94)';
  ctx.fillRect(0, botY, size, botH);
  ctx.fillStyle = strip;
  ctx.fillRect(0, botY - stripH, size, stripH);

  // Team name (LARGE)
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#F5F3EE';
  const nameSize = Math.round(size * 0.085);
  ctx.font = `bold ${nameSize}px ${fonts.display}`;
  ctx.fillText(team.name.toUpperCase(), padX, botY + Math.round(botH * 0.14));

  // Sub-row: row, seat, date
  const subSize = Math.round(size * 0.02);
  ctx.font = `${subSize}px ${fonts.mono}`;
  ctx.fillStyle = '#94A3B8';
  const subY = botY + Math.round(botH * 0.62);
  ctx.fillText(`ROW A`, padX, subY);
  ctx.fillText(`SEAT ${String(team.members.length).padStart(2, '0')}`, padX + Math.round(size * 0.14), subY);
  ctx.fillText(`18.05.26`, padX + Math.round(size * 0.30), subY);
  // VOID line
  ctx.fillStyle = '#F87171';
  ctx.fillText(`VOID AFTER 16:00 IST`, padX, subY + Math.round(subSize * 1.55));

  // Right side: barcode-style vertical lines
  const barcodeX = size - padX - Math.round(size * 0.22);
  const barcodeW = Math.round(size * 0.22);
  const barcodeY = botY + Math.round(botH * 0.18);
  const barcodeH = Math.round(botH * 0.5);
  drawBarcode(ctx, barcodeX, barcodeY, barcodeW, barcodeH);
  ctx.fillStyle = '#94A3B8';
  ctx.font = `${Math.round(size * 0.017)}px ${fonts.mono}`;
  ctx.textAlign = 'center';
  ctx.fillText(`* ${shortId(team.id).toUpperCase()} ${shortId(String(team.registeredAt)).toUpperCase()} *`, barcodeX + barcodeW / 2, barcodeY + barcodeH + Math.round(size * 0.012));

  // Top-right team color chip
  const chipR = Math.round(topH * 0.32);
  ctx.beginPath();
  ctx.arc(size - padX - Math.round(size * 0.20), topH / 2, chipR, 0, Math.PI * 2);
  ctx.fillStyle = team.color;
  ctx.fill();
};

function drawBarcode(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Deterministic-ish vertical lines
  let cursor = x;
  let i = 0;
  while (cursor < x + w - 2) {
    const lineW = i % 3 === 0 ? 4 : i % 4 === 0 ? 5 : 2;
    const gap = i % 5 === 0 ? 5 : 3;
    ctx.fillStyle = '#F5F3EE';
    ctx.fillRect(cursor, y, lineW, h);
    cursor += lineW + gap;
    i++;
  }
}

function shortId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) & 0xffffffff;
  return Math.abs(hash).toString(36).slice(0, 7).padEnd(7, '0');
}

// ─── Template 4: Cover (magazine-style typography) ───────────────────────────

const drawCover: FrameTemplate['drawOverlay'] = (ctx, size, team, fonts) => {
  const padX = Math.round(size * 0.05);

  // Subtle dark fade at top & bottom for legibility
  const topGrad = ctx.createLinearGradient(0, 0, 0, size * 0.4);
  topGrad.addColorStop(0,   'rgba(10, 11, 20, 0.55)');
  topGrad.addColorStop(1,   'rgba(10, 11, 20, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, size, size * 0.4);

  const botGrad = ctx.createLinearGradient(0, size * 0.55, 0, size);
  botGrad.addColorStop(0, 'rgba(10, 11, 20, 0)');
  botGrad.addColorStop(1, 'rgba(10, 11, 20, 0.80)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, size * 0.55, size, size * 0.45);

  // Big INNOVATRIX wordmark at top — extreme tracking
  ctx.fillStyle = '#F5F3EE';
  const titleSize = Math.round(size * 0.11);
  ctx.font = `900 ${titleSize}px ${fonts.display}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('INNOVATRIX', padX, padX);

  // Issue line — mono accent
  const issueSize = Math.round(size * 0.022);
  ctx.font = `${issueSize}px ${fonts.mono}`;
  ctx.fillStyle = '#22D3EE';
  ctx.fillText(`ISSUE №26  ·  MAY 2026  ·  INDIA  ·  ₹ THE PRICE OF AN IDEA`, padX, padX + Math.round(titleSize * 1.05));

  // Cover-line — bottom left team callout + idea snippet
  const lineY = size - padX - Math.round(size * 0.18);
  ctx.fillStyle = '#F5F3EE';
  const colSize = Math.round(size * 0.022);
  ctx.font = `bold ${colSize}px ${fonts.mono}`;
  ctx.fillText('FEATURED  ▶', padX, lineY);

  const nameSize = Math.round(size * 0.075);
  ctx.font = `bold ${nameSize}px ${fonts.display}`;
  ctx.fillText(team.name.toUpperCase(), padX, lineY + Math.round(colSize * 1.6));

  // Idea snippet in italic serif
  const ideaSize = Math.round(size * 0.027);
  ctx.font = `italic 400 ${ideaSize}px ${fonts.serif}`;
  ctx.fillStyle = 'rgba(245, 243, 238, 0.85)';
  const idea = truncate(team.idea, 60);
  ctx.fillText(`“${idea}”`, padX, lineY + Math.round(colSize * 1.6) + Math.round(nameSize * 1.1));

  // Bottom right: page number stamp
  ctx.fillStyle = '#F5F3EE';
  ctx.font = `bold ${Math.round(size * 0.022)}px ${fonts.mono}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`P. 16  /  16`, size - padX, size - padX);
};

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}

// ─── Template 5: Neon (team-color glow + corner brackets) ────────────────────

const drawNeon: FrameTemplate['drawOverlay'] = (ctx, size, team, fonts) => {
  // Slight dark vignette so the photo doesn't compete with the neon outline
  const vig = ctx.createRadialGradient(size / 2, size / 2, size * 0.4, size / 2, size / 2, size * 0.75);
  vig.addColorStop(0, 'rgba(10, 11, 20, 0)');
  vig.addColorStop(1, 'rgba(10, 11, 20, 0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, size, size);

  // Inset glowing frame (in team color)
  const inset = Math.round(size * 0.04);
  const frameW = size - inset * 2;
  // Outer glow — multiple stroked passes
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = team.color;
    ctx.globalAlpha = 0.15 + i * 0.08;
    ctx.lineWidth = (4 - i) * 6;
    ctx.strokeRect(inset, inset, frameW, frameW);
  }
  // Crisp inner stroke
  ctx.globalAlpha = 1;
  ctx.strokeStyle = team.color;
  ctx.lineWidth = 3;
  ctx.strokeRect(inset, inset, frameW, frameW);
  // White inside line for that "tube light" feel
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = 1;
  ctx.strokeRect(inset + 4, inset + 4, frameW - 8, frameW - 8);
  ctx.globalAlpha = 1;

  // Corner viewfinder brackets
  const cornLen = Math.round(size * 0.06);
  const cornInset = Math.round(size * 0.015);
  const cornColor = team.color;
  ctx.strokeStyle = cornColor;
  ctx.lineWidth = 5;
  const brackets: Array<[number, number, number, number]> = [
    // top-left
    [cornInset, cornInset + cornLen, cornInset, cornInset],
    [cornInset, cornInset, cornInset + cornLen, cornInset],
    // top-right
    [size - cornInset, cornInset, size - cornInset - cornLen, cornInset],
    [size - cornInset, cornInset, size - cornInset, cornInset + cornLen],
    // bottom-left
    [cornInset, size - cornInset, cornInset, size - cornInset - cornLen],
    [cornInset, size - cornInset, cornInset + cornLen, size - cornInset],
    // bottom-right
    [size - cornInset, size - cornInset, size - cornInset, size - cornInset - cornLen],
    [size - cornInset, size - cornInset, size - cornInset - cornLen, size - cornInset],
  ];
  brackets.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  // Bottom centered badge: ✱ INNOVATRIX '26 / TEAM X
  const badgeY = size - Math.round(size * 0.085);
  const badgeH = Math.round(size * 0.05);
  ctx.fillStyle = 'rgba(10, 11, 20, 0.85)';
  const badgeText = `✱ INNOVATRIX '26  /  ${team.name.toUpperCase()}`;
  ctx.font = `bold ${Math.round(size * 0.022)}px ${fonts.mono}`;
  const metrics = ctx.measureText(badgeText);
  const badgePadX = Math.round(size * 0.025);
  const badgeW = metrics.width + badgePadX * 2;
  const badgeX = (size - badgeW) / 2;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  // Team-color outline ring
  ctx.strokeStyle = team.color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#F5F3EE';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, size / 2, badgeY + badgeH / 2 + 1);
};

// ─── Template 6: Minimal (corner stamp only) ─────────────────────────────────

const drawMinimal: FrameTemplate['drawOverlay'] = (ctx, size, team, fonts) => {
  const padX = Math.round(size * 0.04);
  const padY = padX;

  // Tiny mono stamp top-left
  ctx.fillStyle = 'rgba(245, 243, 238, 0.95)';
  ctx.font = `bold ${Math.round(size * 0.018)}px ${fonts.mono}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const text = `✱  INNOVATRIX '26  ·  ${team.name.toUpperCase()}  ·  18.05.26`;
  // Subtle dark backing for legibility against any photo
  const metrics = ctx.measureText(text);
  const bgPad = Math.round(size * 0.012);
  ctx.fillStyle = 'rgba(10, 11, 20, 0.55)';
  roundRect(
    ctx,
    padX - bgPad,
    padY - bgPad,
    metrics.width + bgPad * 2,
    Math.round(size * 0.018) + bgPad * 2.4,
    Math.round(size * 0.006),
  );
  ctx.fill();
  ctx.fillStyle = '#F5F3EE';
  ctx.fillText(text, padX, padY);

  // Team-color dot bottom-right
  const dotR = Math.round(size * 0.012);
  ctx.beginPath();
  ctx.arc(size - padX - dotR, size - padY - dotR, dotR, 0, Math.PI * 2);
  ctx.fillStyle = team.color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 243, 238, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
};

// ─── React preview overlays (cosmetic, match the canvas overlays) ────────────

function MarqueePreview({ team }: { team: Team }) {
  return (
    <>
      <div
        className="absolute right-[5%] top-[5%] flex h-[10%] w-[10%] items-center justify-center rounded-full text-[18px] font-bold text-white shadow-lg"
        style={{ background: team.color }}
      >
        ✱
      </div>
      <div
        className="absolute inset-x-0 bottom-0 px-[4.5%] py-[2.5%] text-white"
        style={{ background: 'linear-gradient(90deg, #6366F1 0%, #A78BFA 55%, #22D3EE 100%)' }}
      >
        <div className="font-display text-[clamp(13px,3vw,17px)] font-bold leading-none tracking-tight">
          INNOVATRIX &apos;26
        </div>
        <div className="mt-1 font-mono text-[clamp(8px,1.8vw,10.5px)] uppercase tracking-[0.16em] opacity-90">
          Team {team.name} · 18 May
        </div>
      </div>
    </>
  );
}

function PolaroidPreview({ team }: { team: Team }) {
  // Cream surround around a square photo cut-out. Built from 4 strips so the
  // video underneath shows through the centre rectangle.
  const cream = '#F5F3EE';
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Top strip */}
      <div className="absolute inset-x-0 top-0 h-[6%]" style={{ background: cream }} />
      {/* Left strip */}
      <div className="absolute bottom-[18%] left-0 top-[6%] w-[12%]" style={{ background: cream }} />
      {/* Right strip */}
      <div className="absolute bottom-[18%] right-0 top-[6%] w-[12%]" style={{ background: cream }} />
      {/* Bottom strip with caption */}
      <div className="absolute inset-x-0 bottom-0 h-[18%] flex flex-col items-center justify-center" style={{ background: cream }}>
        <div className="font-serif italic text-[clamp(20px,5vw,32px)] font-light leading-none text-slate-900">
          {team.name}
        </div>
        <div className="mt-1.5 font-mono text-[clamp(7px,1.6vw,10px)] uppercase tracking-[0.22em] text-slate-500">
          INNOVATRIX &apos;26  ·  18 MAY 2026
        </div>
      </div>
    </div>
  );
}

function PassPreview({ team }: { team: Team }) {
  return (
    <>
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-bg/90 px-[4.5%] py-[1.5%] font-mono text-[clamp(7px,1.6vw,10px)] uppercase tracking-[0.16em]">
        <span className="font-bold text-ink">✱ Access · all areas</span>
        <span className="text-mute">Pass № {shortId(team.id).toUpperCase()}</span>
      </div>
      <div
        className="absolute inset-x-0 top-[7%] h-[3px]"
        style={{ background: 'linear-gradient(90deg, #22D3EE, #A78BFA, #22D3EE)' }}
      />
      <div
        className="absolute inset-x-0 bottom-[20%] h-[3px]"
        style={{ background: 'linear-gradient(90deg, #22D3EE, #A78BFA, #22D3EE)' }}
      />
      <div className="absolute inset-x-0 bottom-0 bg-bg/95 px-[4.5%] pb-[3%] pt-[2.5%]">
        <div className="font-display text-[clamp(15px,4.5vw,28px)] font-bold uppercase leading-none tracking-tight text-ink">
          {team.name}
        </div>
        <div className="mt-[2%] flex gap-3 font-mono text-[clamp(6px,1.4vw,9px)] uppercase tracking-[0.18em] text-mute">
          <span>Row A</span>
          <span>Seat {String(team.members.length).padStart(2, '0')}</span>
          <span>18.05.26</span>
        </div>
        <div className="mt-[1%] font-mono text-[clamp(6px,1.4vw,9px)] uppercase tracking-[0.18em] text-danger">
          Void after 16:00 IST
        </div>
      </div>
    </>
  );
}

function CoverPreview({ team }: { team: Team }) {
  return (
    <>
      <div className="absolute inset-x-0 top-0 h-[35%] bg-gradient-to-b from-bg/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-bg/80 to-transparent" />
      <div className="absolute left-[5%] right-[5%] top-[5%]">
        <div className="font-display text-[clamp(18px,7vw,46px)] font-extrabold leading-none tracking-tight text-ink">
          INNOVATRIX
        </div>
        <div className="mt-1 font-mono text-[clamp(6px,1.5vw,10px)] uppercase tracking-[0.22em] text-accent">
          Issue №26 · May 2026 · India
        </div>
      </div>
      <div className="absolute left-[5%] right-[5%] bottom-[5%]">
        <div className="font-mono text-[clamp(6px,1.5vw,10px)] font-bold uppercase tracking-[0.16em] text-ink">
          Featured  ▶
        </div>
        <div className="mt-[1%] font-display text-[clamp(14px,4.5vw,28px)] font-bold uppercase leading-none tracking-tight text-ink">
          {team.name}
        </div>
        <div className="mt-[2%] font-serif italic text-[clamp(8px,2vw,13px)] font-light leading-snug text-ink/85">
          &ldquo;{truncate(team.idea, 60)}&rdquo;
        </div>
      </div>
      <div className="absolute right-[4%] bottom-[2%] font-mono text-[clamp(6px,1.3vw,9px)] font-bold uppercase tracking-[0.16em] text-ink">
        P. 16 / 16
      </div>
    </>
  );
}

function NeonPreview({ team }: { team: Team }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-[4%] rounded-[2%]"
          style={{
            boxShadow: `0 0 0 3px ${team.color}, 0 0 24px ${team.color}, inset 0 0 24px ${team.color}55`,
          }}
        />
      </div>
      {/* Corner brackets */}
      {(['tl','tr','bl','br'] as const).map((pos) => (
        <span key={pos}
          className="pointer-events-none absolute h-[6%] w-[6%]"
          style={{
            ...(pos === 'tl' && { top: '1.5%', left: '1.5%', borderTop: `3px solid ${team.color}`, borderLeft: `3px solid ${team.color}` }),
            ...(pos === 'tr' && { top: '1.5%', right: '1.5%', borderTop: `3px solid ${team.color}`, borderRight: `3px solid ${team.color}` }),
            ...(pos === 'bl' && { bottom: '1.5%', left: '1.5%', borderBottom: `3px solid ${team.color}`, borderLeft: `3px solid ${team.color}` }),
            ...(pos === 'br' && { bottom: '1.5%', right: '1.5%', borderBottom: `3px solid ${team.color}`, borderRight: `3px solid ${team.color}` }),
          }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-[4%] flex justify-center">
        <div
          className="rounded-full bg-bg/85 px-3 py-1 font-mono text-[clamp(7px,1.6vw,10.5px)] font-bold uppercase tracking-[0.16em] text-ink"
          style={{ boxShadow: `0 0 0 1.5px ${team.color}` }}
        >
          ✱ Innovatrix &apos;26 / {team.name}
        </div>
      </div>
    </>
  );
}

function MinimalPreview({ team }: { team: Team }) {
  return (
    <>
      <div className="absolute left-[4%] top-[4%] rounded bg-bg/55 px-2 py-[2px] font-mono text-[clamp(6px,1.4vw,9px)] font-bold uppercase tracking-[0.16em] text-ink">
        ✱  INNOVATRIX &apos;26  ·  {team.name.toUpperCase()}  ·  18.05.26
      </div>
      <div
        className="absolute bottom-[4%] right-[4%] h-[2.4%] w-[2.4%] rounded-full ring-1 ring-ink/70"
        style={{ background: team.color }}
      />
    </>
  );
}

// ─── Template thumbnails (used inside picker chips) ──────────────────────────

function MarqueeThumb({ team }: { team: Team }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-400 to-slate-700">
      <div className="absolute right-1 top-1 h-2 w-2 rounded-full" style={{ background: team.color }} />
      <div className="absolute inset-x-0 bottom-0 h-3" style={{ background: 'linear-gradient(90deg, #6366F1, #A78BFA, #22D3EE)' }} />
    </div>
  );
}
function PolaroidThumb({ team }: { team: Team }) {
  return (
    <div className="absolute inset-0" style={{ background: '#F5F3EE' }}>
      <div className="absolute inset-1 bottom-3 bg-gradient-to-br from-slate-400 to-slate-700" />
      <div className="absolute inset-x-0 bottom-[2px] text-center font-serif italic text-[6px] text-slate-900">
        {team.name.slice(0, 6)}
      </div>
    </div>
  );
}
function PassThumb({ team }: { team: Team }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-400 to-slate-700">
      <div className="absolute inset-x-0 top-0 h-2 bg-bg" />
      <div className="absolute inset-x-0 top-2 h-[1px]" style={{ background: 'linear-gradient(90deg, #22D3EE, #A78BFA)' }} />
      <div className="absolute inset-x-0 bottom-0 h-4 bg-bg" />
      <div className="absolute left-1 bottom-[6px] text-[5px] font-bold uppercase text-ink">{team.name.slice(0, 4)}</div>
    </div>
  );
}
function CoverThumb({ team }: { team: Team }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-500 to-slate-800">
      <div className="absolute left-1 top-1 text-[5px] font-extrabold text-ink">INNOVATRIX</div>
      <div className="absolute left-1 bottom-1 right-1">
        <div className="text-[5px] font-bold uppercase text-ink">{team.name}</div>
      </div>
    </div>
  );
}
function NeonThumb({ team }: { team: Team }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900">
      <div className="absolute inset-1 rounded-sm" style={{ boxShadow: `0 0 0 1.5px ${team.color}, 0 0 6px ${team.color}` }} />
    </div>
  );
}
function MinimalThumb({ team }: { team: Team }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-500 to-slate-700">
      <div className="absolute left-1 top-1 h-[2px] w-6 bg-ink/80" />
      <div className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full ring-1 ring-ink/60" style={{ background: team.color }} />
    </div>
  );
}

// ─── Templates registry ──────────────────────────────────────────────────────

const TEMPLATES: FrameTemplate[] = [
  {
    id: 'marquee',
    name: 'Marquee',
    sub: 'Brand gradient bar',
    drawOverlay: drawMarquee,
    Preview: MarqueePreview,
    Thumb: MarqueeThumb,
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    sub: 'Cream frame, serif caption',
    bg: '#F5F3EE',
    photoRect: { x: 0.12, y: 0.06, w: 0.76, h: 0.76 },
    photoShadow: true,
    drawOverlay: drawPolaroid,
    Preview: PolaroidPreview,
    Thumb: PolaroidThumb,
  },
  {
    id: 'pass',
    name: 'Backstage Pass',
    sub: 'Event laminate',
    drawOverlay: drawPass,
    Preview: PassPreview,
    Thumb: PassThumb,
  },
  {
    id: 'cover',
    name: 'Cover',
    sub: 'Magazine layout',
    drawOverlay: drawCover,
    Preview: CoverPreview,
    Thumb: CoverThumb,
  },
  {
    id: 'neon',
    name: 'Neon',
    sub: 'Team-color glow',
    drawOverlay: drawNeon,
    Preview: NeonPreview,
    Thumb: NeonThumb,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    sub: 'Corner stamp only',
    drawOverlay: drawMinimal,
    Preview: MinimalPreview,
    Thumb: MinimalThumb,
  },
];

// ─── Booth (camera + compose + controls) ─────────────────────────────────────

interface CapturedShot {
  blob: Blob;
  dataUrl: string;
}

function Booth({ team }: { team: Team }) {
  const { push: toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [templateId, setTemplateId] = useState<TemplateId>('marquee');
  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];

  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  /** Raw square photo (no overlay) — cached so template switches don't need re-capture. */
  const [rawDataUrl, setRawDataUrl] = useState<string | null>(null);
  /** Composited shot ready for save/share. */
  const [shot, setShot] = useState<CapturedShot | null>(null);
  const [uploading, setUploading] = useState(false);

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setError(null);
    setStreaming(false);
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setStreaming(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Camera access denied.');
    }
  }, []);

  useEffect(() => {
    if (rawDataUrl) return; // don't restart camera if we've already captured
    void startCamera(facing);
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  /** Capture the current video frame as a raw square JPEG data URL. */
  const captureRaw = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const temp = document.createElement('canvas');
    temp.width = OUTPUT_SIZE;
    temp.height = OUTPUT_SIZE;
    const ctx = temp.getContext('2d');
    if (!ctx) return;
    const srcSize = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - srcSize) / 2;
    const sy = (video.videoHeight - srcSize) / 2;
    if (facing === 'user') {
      ctx.save();
      ctx.translate(OUTPUT_SIZE, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.restore();
    } else {
      ctx.drawImage(video, sx, sy, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    }
    setRawDataUrl(temp.toDataURL('image/jpeg', 0.93));
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    setStreaming(false);
  };

  /** Compose raw + template into the visible canvas. Re-runs when template changes. */
  useEffect(() => {
    if (!rawDataUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const fonts = readFontFamilies();

    const img = new Image();
    img.onload = () => {
      // 1. Background
      ctx.fillStyle = template.bg ?? '#0A0B14';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      // 2. Photo at photoRect
      const r = template.photoRect ?? { x: 0, y: 0, w: 1, h: 1 };
      const px = Math.round(r.x * OUTPUT_SIZE);
      const py = Math.round(r.y * OUTPUT_SIZE);
      const pw = Math.round(r.w * OUTPUT_SIZE);
      const ph = Math.round(r.h * OUTPUT_SIZE);
      if (template.photoShadow) {
        ctx.save();
        ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;
        ctx.fillStyle = '#000';
        ctx.fillRect(px, py, pw, ph);
        ctx.restore();
      }
      ctx.drawImage(img, px, py, pw, ph);

      // 3. Template overlay
      template.drawOverlay(ctx, OUTPUT_SIZE, team, fonts);

      // 4. Export
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          setShot({ blob, dataUrl });
        },
        'image/jpeg',
        0.9,
      );
    };
    img.src = rawDataUrl;
  }, [rawDataUrl, templateId, team, template]);

  const retake = () => {
    setRawDataUrl(null);
    setShot(null);
    void startCamera(facing);
  };

  const flip = () => setFacing((f) => (f === 'user' ? 'environment' : 'user'));

  const saveToPhone = () => {
    if (!shot) return;
    const url = URL.createObjectURL(shot.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `innovatrix-${team.name.replace(/\s+/g, '-').toLowerCase()}-${templateId}-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Saved to your phone.');
  };

  const share = async () => {
    if (!shot) return;
    setUploading(true);
    try {
      await uploadGalleryPhoto(shot.blob, team);
      toast('Shared to the room gallery.');
      retake();
    } catch (e) {
      toast('Upload failed: ' + (e instanceof Error ? e.message : 'unknown'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-6">
      {/* Template picker — always visible, scrollable horizontally */}
      <TemplatePicker value={templateId} onChange={setTemplateId} team={team} />

      {/* Camera / shot preview */}
      <div className="relative mx-auto mt-5 aspect-square w-full max-w-[520px] overflow-hidden rounded-3xl border border-line bg-black">
        {error ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-ink-2">
            <div className="mb-3 text-4xl">📵</div>
            <p className="text-[14px] leading-relaxed">
              {error}<br />
              <span className="text-mute">Tap the camera icon in your address bar to allow access, then reload.</span>
            </p>
          </div>
        ) : shot ? (
          // Composited shot — switching template above re-composes this image
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.dataUrl} alt="Captured" className="h-full w-full object-cover transition-opacity" />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`h-full w-full object-cover ${facing === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            <div className="pointer-events-none absolute inset-0">
              <template.Preview team={team} />
            </div>
            {!streaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-bg/40 font-mono text-[11px] uppercase tracking-[0.18em] text-mute">
                Starting camera…
              </div>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Hint after capture */}
      {shot && (
        <p className="mx-auto mt-3 max-w-[420px] text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-mute">
          Try a different template above ↑ — same photo, new look.
        </p>
      )}

      {/* Controls */}
      {!error && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          {!shot ? (
            <>
              <IconButton onClick={flip} label="Flip camera">⟳</IconButton>
              <button
                onClick={captureRaw}
                disabled={!streaming}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-bg shadow-[0_10px_24px_-8px_rgba(245,243,238,0.4)] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute disabled:shadow-none"
                aria-label="Capture"
              >
                <span className="block h-12 w-12 rounded-full border-[3px] border-bg" />
              </button>
              <IconButton onClick={() => location.reload()} label="Reset">×</IconButton>
            </>
          ) : (
            <>
              <button
                onClick={retake}
                className="rounded-2xl border border-line-2 bg-transparent px-5 py-3.5 text-[14px] font-medium text-ink-2 transition-colors hover:border-primary hover:text-ink"
              >
                Retake
              </button>
              <button
                onClick={saveToPhone}
                className="rounded-2xl border border-line-2 bg-surface px-5 py-3.5 text-[14px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent/[0.06]"
              >
                Save to phone
              </button>
              <button
                onClick={share}
                disabled={uploading}
                className="rounded-2xl bg-primary px-5 py-3.5 text-[14px] font-semibold text-white shadow-glow transition-all hover:-translate-y-px hover:bg-primary-2 hover:shadow-glow-lg disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute disabled:shadow-none"
              >
                {uploading ? 'Uploading…' : 'Share with the room →'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function IconButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-[18px] text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
    >
      {children}
    </button>
  );
}

// ─── Template picker ─────────────────────────────────────────────────────────

function TemplatePicker({
  value, onChange, team,
}: {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
  team: Team;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-mute">
          Template · pick a look
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-mute">
          {TEMPLATES.findIndex((t) => t.id === value) + 1} / {TEMPLATES.length}
        </div>
      </div>
      <div
        className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-2"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        <style>{`.template-strip::-webkit-scrollbar{display:none}`}</style>
        {TEMPLATES.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`group shrink-0 rounded-2xl border p-2 text-left transition-all ${
                active
                  ? 'border-primary bg-primary/[0.08] shadow-glow'
                  : 'border-line-2 bg-surface hover:-translate-y-0.5 hover:border-line-2'
              }`}
            >
              <div className="relative h-20 w-20 overflow-hidden rounded-lg">
                <t.Thumb team={team} />
              </div>
              <div className="mt-2 w-20">
                <div className={`font-display text-[12px] font-semibold leading-tight tracking-tight ${active ? 'text-ink' : 'text-ink'}`}>
                  {t.name}
                </div>
                <div className="mt-0.5 font-mono text-[8.5px] uppercase leading-tight tracking-[0.12em] text-mute line-clamp-2">
                  {t.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

function Gallery({ currentTeamId }: { currentTeamId: string }) {
  const photos = useGallery();
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const isCoord = useIsCoordinator();
  const { push: toast } = useToast();

  return (
    <section className="mt-12">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-[18px] font-semibold tracking-tight">
          Room gallery
        </h3>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
        </span>
      </div>
      {photos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-mute text-[13.5px] leading-relaxed">
          No photos yet — be the first.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setLightbox(p)}
              className={`relative aspect-square overflow-hidden rounded-xl border bg-surface transition-all hover:-translate-y-0.5 ${
                p.teamId === currentTeamId ? 'border-accent/40' : 'border-line'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Photo by ${p.teamName}`} className="h-full w-full object-cover" loading="lazy" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/85 to-transparent p-2 text-left">
                <div className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-white/95">
                  {p.teamName}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-bg/92 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[640px] animate-pop-in overflow-hidden rounded-2xl border border-line-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.url} alt={`Photo by ${lightbox.teamName}`} className="w-full" />
            <button
              onClick={() => setLightbox(null)}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              aria-label="Close"
            >
              ×
            </button>
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 bg-gradient-to-t from-bg/95 to-transparent p-4">
              <div>
                <div className="font-display text-[15px] font-semibold text-white">{lightbox.teamName}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">
                  {new Date(lightbox.uploadedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {isCoord && (
                <button
                  onClick={async () => {
                    if (!confirm('Remove this photo from the gallery?')) return;
                    try {
                      await deleteGalleryPhoto(lightbox);
                      toast('Photo removed.');
                      setLightbox(null);
                    } catch {
                      toast('Remove failed.');
                    }
                  }}
                  className="rounded-full bg-danger/[0.18] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-danger transition-colors hover:bg-danger/[0.28]"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** True if this device has authenticated coordinator session. */
function useIsCoordinator(): boolean {
  const [is, setIs] = useState(false);
  useEffect(() => {
    setIs(readString(STORAGE_KEYS.coordAuth) === '1');
  }, []);
  return is;
}
