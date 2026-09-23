import { afterEach, describe, expect, it, vi } from 'vitest';
import { constantTimeEquals, signAppJwt, verifyAppJwt } from '@/lib/jwt';

afterEach(() => {
  vi.useRealTimers();
});

describe('signAppJwt / verifyAppJwt', () => {
  it('round-trips role claims', () => {
    const { token } = signAppJwt({ app_role: 'team', team_id: 't-123' });
    const claims = verifyAppJwt(token);
    expect(claims?.app_role).toBe('team');
    expect(claims?.team_id).toBe('t-123');
  });

  it('sets the Postgres role Supabase needs for RLS', () => {
    const { token } = signAppJwt({ app_role: 'coordinator' });
    expect(verifyAppJwt(token)).toMatchObject({ role: 'authenticated', iss: 'hostify' });
  });

  it('rejects a token whose payload was tampered with', () => {
    const { token } = signAppJwt({ app_role: 'team', team_id: 't-123' });
    const [h, , s] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ app_role: 'coordinator', exp: 9_999_999_999 })).toString('base64url');
    expect(verifyAppJwt(`${h}.${forged}.${s}`)).toBeNull();
  });

  it('rejects an expired token', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const { token } = signAppJwt({ app_role: 'judge', judge_name: 'Alex' }, 60);
    vi.setSystemTime(new Date('2026-01-01T00:02:00Z'));
    expect(verifyAppJwt(token)).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(verifyAppJwt('not-a-jwt')).toBeNull();
    expect(verifyAppJwt('a.b.c')).toBeNull();
  });
});

describe('constantTimeEquals', () => {
  it('compares PINs correctly regardless of length', () => {
    expect(constantTimeEquals('123456', '123456')).toBe(true);
    expect(constantTimeEquals('123456', '123457')).toBe(false);
    expect(constantTimeEquals('1234', '123456')).toBe(false);
  });
});
