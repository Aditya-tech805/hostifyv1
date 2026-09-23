'use client';

import { useState } from 'react';
import { TEAM_COLORS, type Team } from '@/lib/teams';
import { useToast } from './Toast';
import { EVENT } from '@/config/event';

interface RegisterFormProps {
  initial?: Team;
  onSubmit: (team: Team) => void;
}

const MAX_MEMBERS = 5;
const IDEA_LIMIT = 140;

export function RegisterForm({ initial, onSubmit }: RegisterFormProps) {
  const { push: toast } = useToast();
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState<string | null>(initial?.color ?? null);
  const [members, setMembers] = useState<string[]>(initial?.members ?? ['']);
  const [idea, setIdea] = useState(initial?.idea ?? '');

  const firstMember = members[0]?.trim() ?? '';
  const isValid =
    name.trim().length >= 2 && color != null && firstMember.length >= 2 && idea.trim().length >= 10;

  const updateMember = (idx: number, value: string) => {
    setMembers((arr) => arr.map((m, i) => (i === idx ? value : m)));
  };
  const removeMember = (idx: number) => {
    setMembers((arr) => arr.filter((_, i) => i !== idx));
  };
  const addMember = () => {
    if (members.length >= MAX_MEMBERS) return;
    setMembers((arr) => [...arr, '']);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !color) return;
    const team: Team = {
      id: initial?.id ?? 'team-' + crypto.randomUUID().slice(0, 8),
      name: name.trim(),
      color,
      members: members.map((m) => m.trim()).filter((m) => m.length > 0),
      idea: idea.trim(),
      registeredAt: initial?.registeredAt ?? Date.now(),
    };
    onSubmit(team);
    toast(`Locked in. Welcome to ${EVENT.name}.`);
  };

  return (
    <form onSubmit={submit} autoComplete="off" className="rounded-3xl border border-line bg-surface p-6 shadow-soft">

      <Field label="Team name" hint="make it memorable">
        <input
          type="text"
          maxLength={32}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Phoenix"
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-[15px] text-ink outline-none transition-all placeholder:text-mute focus:border-primary focus:bg-surface-3 focus:shadow-glow"
        />
      </Field>

      <Field label="Team colour" hint="your booth identity">
        <div className="grid grid-cols-6 gap-2.5">
          {TEAM_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              aria-label={c.name}
              onClick={() => setColor(c.hex)}
              className={`relative aspect-square rounded-2xl border-2 transition-all duration-200 hover:-translate-y-0.5 ${
                color === c.hex ? 'scale-105 border-ink shadow-glow' : 'border-transparent'
              }`}
              style={{ background: c.hex }}
            >
              {color === c.hex && (
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.45)]">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Team members" hint="1 to 5 names">
        <div className="space-y-2">
          {members.map((m, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                maxLength={40}
                value={m}
                onChange={(e) => updateMember(idx, e.target.value)}
                placeholder={idx === 0 ? 'Member 1 (you)' : `Member ${idx + 1}`}
                className="flex-1 rounded-[10px] border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary focus:bg-surface-3"
              />
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => removeMember(idx)}
                  aria-label="Remove member"
                  className="h-[38px] w-[38px] rounded-[10px] border border-line bg-surface text-mute transition-colors hover:border-danger/40 hover:bg-danger/[0.06] hover:text-danger"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addMember}
          disabled={members.length >= MAX_MEMBERS}
          className={`mt-2 w-full rounded-[10px] border border-dashed border-line-2 bg-transparent px-3.5 py-2.5 text-[13px] text-ink-2 transition-colors hover:border-primary hover:text-primary ${
            members.length >= MAX_MEMBERS ? 'opacity-40' : ''
          }`}
        >
          + Add another member
        </button>
      </Field>

      <Field label="Your idea, in one line" hint="be punchy, not generic">
        <textarea
          maxLength={IDEA_LIMIT}
          required
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="An AI that translates restaurant menus into 23 languages in real time…"
          className="min-h-[88px] w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-[15px] leading-relaxed text-ink outline-none transition-all placeholder:text-mute focus:border-primary focus:bg-surface-3 focus:shadow-glow"
        />
        <div
          className={`mt-1.5 text-right font-mono text-[11px] ${
            idea.length > 120 ? 'text-spark' : 'text-mute'
          }`}
        >
          {idea.length} / {IDEA_LIMIT}
        </div>
      </Field>

      <button
        type="submit"
        disabled={!isValid}
        className="gradient-animate mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand bg-[length:200%_200%] px-5 py-4 text-[15px] font-semibold text-white shadow-glow transition-all hover:-translate-y-px hover:shadow-glow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:bg-none disabled:text-mute disabled:shadow-none"
      >
        <span>Lock it in</span>
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-[18px] last:mb-0">
      <label className="mb-2 block font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">
        {label}
        {hint && (
          <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-mute">
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
