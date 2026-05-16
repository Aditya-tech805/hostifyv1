'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useResults, useAllScores, useAllTeams } from '@/lib/data';
import { JUDGING_CRITERIA } from '@/lib/activities';
import type { Team } from '@/lib/teams';

interface RankedTeam {
  team: Team;
  total: number;
  judgeCount: number;
}

function aggregateScores(
  teams: Team[],
  allScores: ReturnType<typeof useAllScores>,
): RankedTeam[] {
  const ranked: RankedTeam[] = teams.map((team) => {
    let total = 0;
    let judgeCount = 0;
    Object.values(allScores).forEach((judgeMap) => {
      const entry = judgeMap?.[team.id];
      if (!entry) return;
      const sub = JUDGING_CRITERIA.reduce(
        (acc, c) => acc + ((entry as Record<string, number | string | undefined>)[c.id] as number | undefined ?? 0),
        0,
      );
      total += sub;
      judgeCount += 1;
    });
    return { team, total, judgeCount };
  });
  // Sort descending by total, tie-break by name for stability
  ranked.sort((a, b) => b.total - a.total || a.team.name.localeCompare(b.team.name));
  return ranked;
}

/**
 * Renders nothing until the coordinator hits "Reveal results". When revealed,
 * fills the screen with confetti + ranked podium. Visible on every device
 * including the projector.
 */
export function ResultsOverlay() {
  const [results] = useResults();
  const teams = useAllTeams();
  const allScores = useAllScores();
  const ranked = useMemo(() => aggregateScores(teams, allScores), [teams, allScores]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Spawn confetti for ~6 seconds when revealed
  useEffect(() => {
    if (!results?.revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = ['#7c3aed', '#84cc16', '#f97316', '#f43f5e', '#0ea5e9', '#fbbf24'];
    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      rot: number; vrot: number;
      size: number;
      color: string;
      life: number;
    }
    const particles: Particle[] = [];
    const spawnBurst = (cx: number, cy: number, count: number) => {
      for (let i = 0; i < count; i++) {
        particles.push({
          x: cx,
          y: cy,
          vx: (Math.random() - 0.5) * 8,
          vy: -Math.random() * 14 - 4,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 0.4,
          size: 6 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
        });
      }
    };
    // 3 bursts at 0s, 0.4s, 0.8s
    spawnBurst(window.innerWidth * 0.5, window.innerHeight * 0.4, 80);
    const t1 = window.setTimeout(() => spawnBurst(window.innerWidth * 0.25, window.innerHeight * 0.35, 50), 400);
    const t2 = window.setTimeout(() => spawnBurst(window.innerWidth * 0.75, window.innerHeight * 0.35, 50), 800);
    // Side bursts so confetti reaches edges of bigscreen
    const t3 = window.setTimeout(() => spawnBurst(window.innerWidth * 0.1, window.innerHeight * 0.5, 40), 1300);
    const t4 = window.setTimeout(() => spawnBurst(window.innerWidth * 0.9, window.innerHeight * 0.5, 40), 1300);

    const gravity = 0.35;
    const drag = 0.992;

    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += gravity;
        p.vx *= drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.life -= 0.005;
        if (p.y > window.innerHeight + 60 || p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [results?.revealed, results?.at]);

  if (!results?.revealed) return null;
  if (teams.length === 0) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-bg/85 backdrop-blur-2xl animate-fade-in">
        <div className="text-center">
          <div className="font-display text-4xl font-semibold tracking-tight">Thank you, everyone.</div>
          <div className="mt-4 text-mute">No teams scored. Wait for judges to submit.</div>
        </div>
      </div>
    );
  }

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const place = ['🥇', '🥈', '🥉'];

  return (
    <div className="fixed inset-0 z-[300] overflow-y-auto bg-bg/85 backdrop-blur-2xl animate-fade-in" style={{ backgroundImage: 'radial-gradient(ellipse 50% 50% at 30% 20%, rgba(79,70,229,0.16), transparent 70%), radial-gradient(ellipse 50% 50% at 70% 80%, rgba(245,158,11,0.16), transparent 70%)' }}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[10]"
      />
      <div className="relative z-[5] mx-auto max-w-[1200px] px-5 py-12 sm:py-20">
        <div className="mb-10 text-center">
          <div className="mb-5 inline-flex items-center rounded-full border border-spark/40 bg-spark/[0.10] px-5 py-2 font-mono text-[14px] uppercase tracking-[0.32em] text-spark">
            <span className="mr-3 inline-block h-2 w-2 animate-pulse-soft rounded-full bg-spark" />
            Final Results
          </div>
          <h1 className="bg-gradient-to-b from-ink to-ink/65 bg-clip-text font-display text-[clamp(48px,8vw,96px)] font-bold leading-none tracking-tight text-transparent">
            Winners.
          </h1>
          <p className="mt-4 text-[15px] text-mute">
            Aggregated from {Object.keys(allScores).length} {Object.keys(allScores).length === 1 ? 'judge' : 'judges'} · 5 criteria × 0–10 each.
          </p>
        </div>

        {/* Podium */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {podium.map((r, i) => (
            <div
              key={r.team.id}
              className="animate-pop-in overflow-hidden rounded-2xl border-2 p-6"
              style={{
                borderColor: r.team.color,
                background: `linear-gradient(140deg, color-mix(in srgb, ${r.team.color} 32%, #0a0a0f), #0a0a0f)`,
                animationDelay: `${i * 250}ms`,
                animationFillMode: 'both',
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-5xl">{place[i]}</span>
                <span
                  className="rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em]"
                  style={{ background: r.team.color, color: '#0a0a0f' }}
                >
                  Rank {i + 1}
                </span>
              </div>
              <h3 className="font-display text-[clamp(24px,3vw,36px)] font-semibold leading-tight tracking-tight">
                {r.team.name}
              </h3>
              <p className="mt-2 line-clamp-3 text-[14.5px] leading-relaxed text-ink-2">&ldquo;{r.team.idea}&rdquo;</p>
              <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">
                  Score
                </div>
                <div>
                  <span className="font-display text-3xl font-bold text-accent">{r.total}</span>
                  <span className="ml-1 font-mono text-[12px] text-mute"> from {r.judgeCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rest of the field */}
        {rest.length > 0 && (
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-mute">
              Full standings
            </div>
            <div className="space-y-1.5">
              {rest.map((r, i) => (
                <div
                  key={r.team.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-surface-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 font-mono text-sm text-mute">{i + 4}</span>
                    <span className="h-3 w-3 rounded" style={{ background: r.team.color }} />
                    <span className="font-display text-[15px] font-medium">{r.team.name}</span>
                  </div>
                  <span className="font-mono text-sm">
                    <span className="text-accent">{r.total}</span>
                    <span className="text-mute"> · {r.judgeCount} {r.judgeCount === 1 ? 'judge' : 'judges'}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
