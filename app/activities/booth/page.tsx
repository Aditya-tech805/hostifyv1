'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { ActivityHeader } from '@/components/ActivityHeader';
import { ToastProvider, useToast } from '@/components/Toast';
import { useGallery, uploadGalleryPhoto, deleteGalleryPhoto, type Photo } from '@/lib/data';
import { readOwnTeam, type Team } from '@/lib/teams';
import { readString, STORAGE_KEYS } from '@/lib/storage';

export default function BoothPage() {
  return (
    <ToastProvider>
      <TopBar />
      <main className="mx-auto max-w-[920px] px-5 pb-20 pt-6">
        <ActivityHeader
          step="Activity · All day"
          title="Photo Booth"
          description="Snap a selfie with the INNOVATRIX frame. Save it to your phone for later, or share it with the room. Built for stories, reels, and the wall outside."
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
          Register your team first — the frame uses your team name.
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
      <Camera team={team} />
      <Gallery currentTeamId={team.id} />
    </>
  );
}

// ─── Camera + capture + frame composition ────────────────────────────────────

interface CapturedShot {
  blob: Blob;
  dataUrl: string;
}

function Camera({ team }: { team: Team }) {
  const { push: toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [streaming, setStreaming] = useState(false);
  const [shot, setShot] = useState<CapturedShot | null>(null);
  const [uploading, setUploading] = useState(false);

  // Start / restart the camera stream
  const startCamera = useCallback(async (facingMode: 'user' | 'environment') => {
    setError(null);
    setStreaming(false);
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setStreaming(true);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Camera access denied.';
      setError(message);
    }
  }, []);

  // Initial start
  useEffect(() => {
    void startCamera(facing);
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  /** Capture current frame + draw the brand overlay into the canvas. */
  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    // Output a square crop so the gallery grid stays clean
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Centre-crop the video frame into the square canvas
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    if (facing === 'user') {
      // Mirror the front camera so it matches the preview
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, size, size, -size, 0, size, size);
      ctx.restore();
    } else {
      ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    }

    // ── Brand overlay ──────────────────────────────────────────────────────
    drawFrame(ctx, size, team);

    // Convert to blob (~70% JPEG quality keeps file size under ~200KB)
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setShot({ blob, dataUrl });
        // Stop the live stream so the preview freezes
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        setStreaming(false);
      },
      'image/jpeg',
      0.7,
    );
  };

  const retake = () => {
    setShot(null);
    void startCamera(facing);
  };

  const flip = () => {
    setFacing((f) => (f === 'user' ? 'environment' : 'user'));
  };

  const saveToPhone = () => {
    if (!shot) return;
    const url = URL.createObjectURL(shot.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `innovatrix-${team.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
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
      toast('Shared to the gallery.');
      retake();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed.';
      toast('Upload failed: ' + msg);
    } finally {
      setUploading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="mt-6">
      <div
        className="relative mx-auto aspect-square w-full max-w-[520px] overflow-hidden rounded-3xl border border-line bg-black"
      >
        {error ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-ink-2">
            <div className="mb-3 text-4xl">📵</div>
            <p className="text-[14px] leading-relaxed">
              {error}<br />
              <span className="text-mute">Tap the camera icon in your address bar to allow access, then reload.</span>
            </p>
          </div>
        ) : shot ? (
          // Frozen preview of the captured shot
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.dataUrl} alt="Captured" className="h-full w-full object-cover" />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`h-full w-full object-cover ${facing === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            {/* Live preview overlay — gives the user a sense of what the captured frame looks like */}
            <PreviewOverlay team={team} />
            {!streaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-bg/40 font-mono text-[11px] uppercase tracking-[0.18em] text-mute">
                Starting camera…
              </div>
            )}
          </>
        )}
        {/* Hidden canvas — does the composition */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      {!error && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          {!shot ? (
            <>
              <IconButton onClick={flip} label="Flip">⟳</IconButton>
              <button
                onClick={capture}
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
                className="rounded-2xl bg-primary px-5 py-3.5 text-[14px] font-semibold text-ink shadow-[0_6px_24px_-10px_rgba(124,58,237,0.55)] transition-all hover:-translate-y-px hover:bg-primary-2 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute disabled:shadow-none"
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

function PreviewOverlay({ team }: { team: Team }) {
  // Cosmetic overlay matching what gets composited at capture time
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-[18px] font-bold text-white shadow-lg"
        style={{ background: team.color }}
      >
        ✱
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 px-4 py-3 text-white"
        style={{ background: `linear-gradient(90deg, #7c3aed, #f97316)` }}
      >
        <div className="font-display text-[15px] font-bold leading-none tracking-tight">INNOVATRIX &apos;26</div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] opacity-90">
          Team {team.name} · 18 May
        </div>
      </div>
    </div>
  );
}

/**
 * Draw the INNOVATRIX brand frame onto a canvas context.
 * Mirrors the on-preview overlay so the captured image matches the preview.
 */
function drawFrame(ctx: CanvasRenderingContext2D, size: number, team: Team) {
  // Bottom gradient bar
  const barHeight = Math.round(size * 0.13);
  const grad = ctx.createLinearGradient(0, size - barHeight, size, size);
  grad.addColorStop(0, '#7c3aed');
  grad.addColorStop(1, '#f97316');
  ctx.fillStyle = grad;
  ctx.fillRect(0, size - barHeight, size, barHeight);

  // INNOVATRIX wordmark
  const padX = Math.round(size * 0.045);
  ctx.fillStyle = '#ffffff';
  const titleSize = Math.round(size * 0.05);
  ctx.font = `bold ${titleSize}px Space Grotesk, system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(`INNOVATRIX '26`, padX, size - barHeight + Math.round(barHeight * 0.18));

  // Team / date sub-line
  const subSize = Math.round(size * 0.025);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.font = `${subSize}px "JetBrains Mono", ui-monospace, monospace`;
  const sub = `TEAM ${team.name.toUpperCase()} · 18 MAY 2026`;
  ctx.fillText(sub, padX, size - barHeight + Math.round(barHeight * 0.58));

  // Top-right asterisk badge (filled circle in team colour with a white *)
  const badgeR = Math.round(size * 0.046);
  const badgeX = size - padX - badgeR;
  const badgeY = padX + badgeR;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = team.color;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(badgeR * 1.6)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✱', badgeX, badgeY + 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

function Gallery({ currentTeamId }: { currentTeamId: string }) {
  const photos = useGallery();
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const isCoord = useIsCoordinator();
  const { push: toast } = useToast();

  return (
    <section className="mt-10">
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

