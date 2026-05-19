'use client';

import { useEffect, useMemo, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { PinKeypad } from '@/components/PinKeypad';
import { ToastProvider, useToast } from '@/components/Toast';
import { type Team } from '@/lib/teams';
import { STORAGE_KEYS, readString, writeString, removeKey } from '@/lib/storage';
import { readAppToken, writeAppToken, clearAppToken } from '@/lib/auth-client';
import {
  useAllTeams,
  useFinalResults, setFinalResults, setCeremonyStage,
  type CeremonyStage, type FinalRanking, type FinalResults,
} from '@/lib/data';

/**
 * Coordinator console - post-event Prize Distribution Ceremony build.
 *
 * The console now exists for one thing: driving the projector through
 * the ceremony reveal stages, with a rankings table for entering /
 * correcting the 24-team data behind it.
 */
export default function ConsolePage() {
  return (
    <ToastProvider>
      <ConsoleShell />
    </ToastProvider>
  );
}

function ConsoleShell() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => { setAuthed(readAppToken()?.app_role === 'coordinator'); }, []);
  if (authed === null) return null;
  if (!authed) {
    return (
      <PinKeypad
        role="Coordinator Access"
        roleTone="primary"
        title="Enter coordinator PIN"
        subtitle="Server-verified. Required to run the prize ceremony."
        onSubmitPin={async (pin) => {
          const res = await fetch('/api/auth/coordinator', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ pin }),
          });
          if (res.status === 401) return false;
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.error || 'Auth failed.');
          }
          const data = (await res.json()) as { token: string; exp: number };
          writeAppToken({ token: data.token, exp: data.exp, app_role: 'coordinator' });
          window.location.reload();
          return true;
        }}
        backHref="/"
      />
    );
  }
  return (
    <Console
      onSignOut={() => {
        clearAppToken();
        removeKey(STORAGE_KEYS.coordAuth);
        setAuthed(false);
        window.location.reload();
      }}
    />
  );
}

function Console({ onSignOut }: { onSignOut: () => void }) {
  const teams = useAllTeams();
  const [results] = useFinalResults();

  return (
    <div className="min-h-screen bg-bg pb-20">
      <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-3 font-display font-semibold tracking-tight text-ink">
            <BrandMark filled size={22} />
            <span>INNOVATRIX</span>
            <span className="rounded-full border border-primary/40 bg-primary/[0.10] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary-2">
              Ceremony console
            </span>
          </div>
          <button
            onClick={onSignOut}
            className="rounded-full border border-line bg-transparent px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-mute transition-colors hover:border-danger/40 hover:text-danger"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 pt-6">
        <StageControl results={results} />
        <RankingsEditor results={results} teams={teams} />
      </main>
    </div>
  );
}

// ─── Stage control (big reveal buttons) ─────────────────────────────────────

const STAGE_OPTIONS: { id: CeremonyStage; label: string; desc: string; tint: string }[] = [
  { id: 'idle',        label: '🛑 Hide everything',     desc: 'Pulls all reveals off the projector AND every participant phone. Use to reset between rehearsals.', tint: '#94A3B8' },
  { id: 'third',       label: '🥉 Reveal 3rd place',    desc: 'Slam in the bronze winner.',                  tint: '#F87171' },
  { id: 'second',      label: '🥈 Reveal 2nd place',    desc: 'Same beat, bigger drama.',                    tint: '#A78BFA' },
  { id: 'first',       label: '🥇 Reveal 1st place',    desc: 'Confetti + gold celebration.',                tint: '#FBBF24' },
  { id: 'leaderboard', label: '📊 Show full leaderboard', desc: 'All 24 teams in ranked order, DQ at bottom.', tint: '#22D3EE' },
];

function StageControl({ results }: { results: FinalResults | null }) {
  const { push: toast } = useToast();
  const stage = results?.stage ?? 'idle';
  const current = STAGE_OPTIONS.find((s) => s.id === stage)!;
  const isHidden = stage === 'idle';

  return (
    <section className="mb-6 rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-[18px] font-semibold tracking-tight text-ink">
            Stage control
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
            Click a stage to switch what the projector + every phone shows. <b>Order:</b> Hidden &rarr; 3rd &rarr; 2nd &rarr; 1st &rarr; Leaderboard.
            Participants see only what&rsquo;s currently revealed - nothing is leaked before its stage.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-mute">Currently showing</div>
          <div className="mt-0.5 font-display text-[15px] font-bold" style={{ color: current.tint }}>
            {current.label.replace(/^[^\s]+\s/, '')}
          </div>
        </div>
      </div>

      {/* PROMINENT panic button at the top - always visible so the coord
          can blank every screen instantly without scanning the stage grid. */}
      <button
        onClick={() => setCeremonyStage(results, 'idle')}
        disabled={isHidden}
        className={`mb-3 flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3.5 font-display text-[14.5px] font-semibold transition-all ${
          isHidden
            ? 'cursor-not-allowed border-line bg-surface-2 text-mute'
            : 'border-danger/50 bg-danger/[0.08] text-danger hover:-translate-y-px hover:border-danger hover:bg-danger/[0.14]'
        }`}
      >
        {isHidden
          ? '✓ Everything hidden from participants · safe state'
          : '🛑 Hide everything immediately · wipes the projector + every phone'}
      </button>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-5">
        {STAGE_OPTIONS.map((opt) => {
          const active = opt.id === stage;
          return (
            <button
              key={opt.id}
              onClick={() => setCeremonyStage(results, opt.id)}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition-all ${
                active
                  ? 'shadow-soft'
                  : 'border-line bg-surface-2 text-ink-2 hover:border-line-2 hover:text-ink'
              }`}
              style={active ? { background: opt.tint + '14', borderColor: opt.tint + '66', color: opt.tint } : undefined}
            >
              <span className="font-display text-[14px] font-semibold leading-tight">
                {opt.label}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-80">
                {opt.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Heavier nuke - actually wipes the rankings data from kv. Only use
          this after the ceremony when nothing should be recoverable. */}
      <div className="mt-4 border-t border-line pt-4">
        <button
          onClick={() => {
            if (!confirm('Wipe ALL rankings data?\n\nThis deletes every team rank + score from the database. The projector and every phone will fall back to idle. Use this only after the ceremony - it cannot be undone.')) return;
            setFinalResults(null);
            toast('All rankings cleared. Stage back to idle.');
          }}
          className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-mute hover:text-danger"
        >
          ⚠ Wipe all rankings data (post-ceremony cleanup, irreversible)
        </button>
      </div>
    </section>
  );
}

// ─── Rankings editor (24-row table + paste-from-CSV) ────────────────────────

function RankingsEditor({ results, teams }: { results: FinalResults | null; teams: Team[] }) {
  const { push: toast } = useToast();
  const initial = results?.rankings ?? [];
  const [rows, setRows] = useState<FinalRanking[]>(() => initial);
  const [pasteOpen, setPasteOpen] = useState(false);

  // If the synced rankings change from elsewhere (e.g., another device),
  // refresh the local editing state too.
  useEffect(() => {
    setRows(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results?.rankings.length, results?.revealedAt]);

  const teamColors = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teams) m.set(t.name.toLowerCase(), t.color);
    return m;
  }, [teams]);

  const teamIds = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teams) m.set(t.name.toLowerCase(), t.id);
    return m;
  }, [teams]);

  const onSave = () => {
    // Resolve colors / team IDs from the live teams list for any rows
    // that don't already have one set.
    const enriched: FinalRanking[] = rows.map((r) => {
      const key = r.teamName.trim().toLowerCase();
      return {
        ...r,
        teamName: r.teamName.trim(),
        color: r.color ?? teamColors.get(key),
        teamId: r.teamId ?? teamIds.get(key),
      };
    });
    setFinalResults({
      rankings: enriched,
      stage: results?.stage ?? 'idle',
      revealedAt: results?.revealedAt,
    });
    toast(`Saved ${enriched.length} entries.`);
  };

  const onAddRow = () => {
    setRows((rs) => [
      ...rs,
      { rank: rs.length + 1, teamName: '', marks: 0 },
    ]);
  };

  const onRemoveRow = (idx: number) => {
    setRows((rs) => rs.filter((_, i) => i !== idx));
  };

  const onUpdate = (idx: number, patch: Partial<FinalRanking>) => {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[18px] font-semibold tracking-tight text-ink">
            Final rankings
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
            One row per team. Disqualified entries: tick the box - they go to the bottom of the leaderboard with a DQ badge.
            Save after edits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPasteOpen(true)}
            className="rounded-xl border border-line bg-surface-2 px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 hover:border-accent hover:text-ink"
          >
            Paste CSV
          </button>
          <button
            onClick={onAddRow}
            className="rounded-xl border border-line bg-surface-2 px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 hover:border-primary hover:text-ink"
          >
            + Row
          </button>
          <button
            onClick={onSave}
            className="rounded-xl bg-primary px-4 py-2 font-display text-[13px] font-semibold text-white shadow-glow transition-all hover:-translate-y-px hover:bg-primary-2 hover:shadow-glow-lg"
          >
            Save
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-2 bg-surface-2 p-6 text-center text-[13px] text-mute">
          No rankings yet. Click <b className="text-ink">Paste CSV</b> to bulk-import, or <b className="text-ink">+ Row</b> to start a manual entry.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="hidden grid-cols-[60px_80px_1fr_120px_70px_40px] gap-2 border-b border-line bg-bg/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-mute md:grid">
            <div>Rank</div>
            <div>Team #</div>
            <div>Team name</div>
            <div className="text-right">Marks</div>
            <div className="text-center">DQ</div>
            <div></div>
          </div>
          <div className="divide-y divide-line">
            {rows.map((r, i) => (
              <RankingRow
                key={i}
                row={r}
                index={i}
                onChange={(patch) => onUpdate(i, patch)}
                onRemove={() => onRemoveRow(i)}
              />
            ))}
          </div>
        </div>
      )}

      {pasteOpen && (
        <PasteCsvModal
          onClose={() => setPasteOpen(false)}
          onParsed={(parsed) => {
            setRows(parsed);
            setPasteOpen(false);
            toast(`Parsed ${parsed.length} rows. Click Save to publish.`);
          }}
        />
      )}
    </section>
  );
}

function RankingRow({
  row, index, onChange, onRemove,
}: {
  row: FinalRanking;
  index: number;
  onChange: (patch: Partial<FinalRanking>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[60px_80px_1fr_120px_70px_40px] gap-2 px-3 py-2 hover:bg-surface-2/40">
      <input
        type="text"
        inputMode="numeric"
        value={row.disqualified ? 'DQ' : String(row.rank)}
        onChange={(e) => {
          const v = e.target.value.trim();
          if (v.toLowerCase() === 'dq') {
            onChange({ disqualified: true, rank: -1 });
          } else {
            const n = parseInt(v, 10);
            if (!Number.isNaN(n)) onChange({ rank: n, disqualified: false });
          }
        }}
        className="rounded border border-line bg-bg px-2 py-1.5 text-center font-mono text-[12px] text-ink outline-none focus:border-primary"
        aria-label={`Rank for row ${index + 1}`}
      />
      <input
        type="number"
        value={row.teamNumber ?? ''}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange({ teamNumber: Number.isNaN(n) ? undefined : n });
        }}
        placeholder="-"
        className="rounded border border-line bg-bg px-2 py-1.5 text-center font-mono text-[12px] text-ink outline-none focus:border-primary"
        aria-label={`Team number for row ${index + 1}`}
      />
      <input
        type="text"
        value={row.teamName}
        onChange={(e) => onChange({ teamName: e.target.value })}
        placeholder="Team name"
        className="rounded border border-line bg-bg px-2 py-1.5 font-display text-[13px] text-ink outline-none focus:border-primary"
        aria-label={`Team name for row ${index + 1}`}
      />
      <input
        type="number"
        step="0.01"
        value={row.marks}
        onChange={(e) => onChange({ marks: parseFloat(e.target.value) || 0 })}
        className="rounded border border-line bg-bg px-2 py-1.5 text-right font-mono text-[12px] text-ink outline-none focus:border-primary"
        aria-label={`Marks for row ${index + 1}`}
      />
      <label className="flex cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={!!row.disqualified}
          onChange={(e) => onChange({ disqualified: e.target.checked, rank: e.target.checked ? -1 : Math.max(1, row.rank) })}
          className="h-4 w-4 cursor-pointer"
          aria-label="Disqualified"
        />
      </label>
      <button
        onClick={onRemove}
        aria-label="Remove row"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-bg text-mute transition-colors hover:border-danger/40 hover:text-danger"
      >
        ×
      </button>
    </div>
  );
}

function PasteCsvModal({
  onClose, onParsed,
}: {
  onClose: () => void;
  onParsed: (rows: FinalRanking[]) => void;
}) {
  const [raw, setRaw] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const parse = () => {
    try {
      const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const out: FinalRanking[] = [];
      for (const line of lines) {
        // Skip header lines that contain the word "rank" / "team" / "marks"
        if (/^(rank|team|marks)\b/i.test(line) && /(team\s*name|team\s*no|marks)/i.test(line)) continue;
        // Allow tab or comma separated. Strip emoji medals.
        const cleaned = line.replace(/[🥇🥈🥉🏆]/gu, '').trim();
        const parts = cleaned.split(/\t+|,/).map((p) => p.trim()).filter(Boolean);
        if (parts.length < 3) continue;
        let [rankStr, teamNoStr, ...rest] = parts;
        // Pull marks off the end first, then everything in between is the name.
        const marksStr = rest.pop() ?? '';
        const teamName = rest.join(', ').trim();
        const isDQ = /^dq\b/i.test(rankStr) || /disqualif/i.test(line);
        const rank = isDQ ? -1 : (parseInt(rankStr, 10) || 0);
        const teamNumber = parseInt(teamNoStr, 10);
        const marks = parseFloat(marksStr.replace(/[^0-9.\-]/g, '')) || 0;
        if (!teamName) continue;
        out.push({
          rank,
          teamNumber: Number.isNaN(teamNumber) ? undefined : teamNumber,
          teamName,
          marks,
          disqualified: isDQ || undefined,
        });
      }
      if (out.length === 0) {
        setErr('Could not parse any rows. Expected each line like:  1\\tCode of Duty\\t42.00');
        return;
      }
      onParsed(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Parse failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-bg/80 p-5 backdrop-blur-md">
      <div className="w-full max-w-[720px] rounded-2xl border border-line-2 bg-surface p-6 shadow-soft-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-[18px] font-semibold tracking-tight text-ink">
            Paste CSV / TSV
          </h3>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-bg text-mute hover:border-danger/40 hover:text-danger">
            ×
          </button>
        </div>
        <p className="mb-3 text-[12.5px] leading-relaxed text-ink-2">
          One row per line. Tab-separated or comma-separated. Columns:
          <b className="text-ink"> rank, team number, team name, marks.</b> Header line is OK - it&rsquo;s skipped automatically.
          Use <code className="font-mono text-[11px] text-accent">DQ</code> in the rank column for disqualified entries.
        </p>
        <textarea
          rows={12}
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setErr(null); }}
          placeholder={`1\tCode of Duty\t42.00\n2\t19\tMANWO\t40.33\n3\t22\tSentinels\t38.00\n...`}
          className="w-full resize-none rounded-xl border border-line bg-bg px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-ink outline-none focus:border-primary"
        />
        {err && <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-danger">{err}</div>}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-line bg-surface-2 px-4 py-2 text-[13px] text-ink-2 hover:text-ink">Cancel</button>
          <button
            onClick={parse}
            disabled={raw.trim().length === 0}
            className="rounded-xl bg-primary px-5 py-2 font-display text-[13px] font-semibold text-white shadow-glow hover:bg-primary-2 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-mute disabled:shadow-none"
          >
            Parse &amp; load
          </button>
        </div>
      </div>
    </div>
  );
}
