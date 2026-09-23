import { describe, expect, it } from 'vitest';
import { ALLOWED_TEAM_COLORS, sanitizeTeamFields, validateTeamFields } from '@/lib/team-validate';
import { TEAM_COLORS } from '@/lib/teams';

const valid = {
  name: 'Northwind',
  color: '#6366F1',
  members: ['Alex', 'Sam'],
  idea: 'Hyperlocal weather alerts for farmers via SMS',
};

describe('sanitizeTeamFields', () => {
  it('strips zero-width and bidi-override characters', () => {
    const out = sanitizeTeamFields({ ...valid, name: 'North​wind‮' });
    expect(out.name).toBe('Northwind');
  });

  it('collapses whitespace and enforces length caps', () => {
    const out = sanitizeTeamFields({ ...valid, name: '  a   b  ' + 'x'.repeat(100), idea: 'y'.repeat(500) });
    expect(out.name.startsWith('a b ')).toBe(true);
    expect(out.name).toHaveLength(32);
    expect(out.idea).toHaveLength(140);
  });

  it('drops non-string and blank members and caps the team at five', () => {
    const out = sanitizeTeamFields({ ...valid, members: ['A', 42, '   ', 'B', 'C', 'D', 'E', 'F'] });
    expect(out.members).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('coerces garbage input into an empty shape instead of throwing', () => {
    expect(sanitizeTeamFields(null)).toEqual({ name: '', color: '', members: [], idea: '' });
    expect(sanitizeTeamFields({ name: 5, members: 'nope' })).toEqual({ name: '', color: '', members: [], idea: '' });
  });
});

describe('validateTeamFields', () => {
  it('accepts a well-formed team', () => {
    expect(validateTeamFields(sanitizeTeamFields(valid))).toEqual({ ok: true });
  });

  it.each([
    ['short name', { name: 'A' }],
    ['colour outside the allowlist', { color: '#000000' }],
    ['no members', { members: [] }],
    ['idea too short', { idea: 'too short' }],
  ])('rejects %s', (_label, patch) => {
    const result = validateTeamFields(sanitizeTeamFields({ ...valid, ...patch }));
    expect(result.ok).toBe(false);
  });
});

describe('team colours', () => {
  it('the client picker offers exactly the colours the server accepts', () => {
    expect(TEAM_COLORS.map((c) => c.hex).sort()).toEqual([...ALLOWED_TEAM_COLORS].sort());
  });
});
