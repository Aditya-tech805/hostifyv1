// ─────────────────────────────────────────────────────────────────────────────
// Server-only JWT helpers.
//
// Signs and verifies HS256 JWTs using Supabase's JWT secret, so the same
// token works for our app *and* Supabase PostgREST / Realtime (which means
// RLS policies can authorize writes via `auth.jwt() ->> 'app_role'`).
//
// IMPORTANT: never import this from a client component. It reads
// SUPABASE_JWT_SECRET, which must stay server-side.
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual } from 'crypto';

// In dev / localStorage-only mode the secret may be absent. The JWT is still
// issued so the client UI gating works, but Supabase wouldn't accept it.
// In production with Supabase enabled, this MUST be set.
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'dev-only-secret-do-not-use-in-prod';

export type AppRole = 'coordinator' | 'judge' | 'team';

export interface AppClaims {
  app_role: AppRole;
  /** For judges — the name they signed in with, stamped into scores. */
  judge_name?: string;
  /** For teams — the team_id this device owns. */
  team_id?: string;
}

export interface VerifiedClaims extends AppClaims {
  iat: number;
  exp: number;
}

function b64urlEncode(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(s: string): Buffer {
  const pad = (4 - (s.length % 4)) % 4;
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad), 'base64');
}

/**
 * Issue a JWT for the given app role. TTL defaults to 12 hours — covers
 * a full event day even with breaks. Tokens are stateless; no server
 * session table.
 */
export function signAppJwt(claims: AppClaims, ttlSeconds = 12 * 3600): { token: string; exp: number } {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  const payload = {
    iss: 'hostify',
    iat,
    exp,
    // Supabase reads this field to pick the Postgres role. We use the
    // built-in 'authenticated' role — the RLS policies then branch on
    // app_role for finer-grained checks.
    role: 'authenticated',
    ...claims,
  };
  const header = { alg: 'HS256', typ: 'JWT' };
  const signingInput = `${b64urlEncode(JSON.stringify(header))}.${b64urlEncode(JSON.stringify(payload))}`;
  const sig = createHmac('sha256', JWT_SECRET).update(signingInput).digest();
  return { token: `${signingInput}.${b64urlEncode(sig)}`, exp };
}

/**
 * Verify a token's signature + expiry. Returns null if invalid.
 * Use this when accepting tokens server-side (e.g. on rate-limited write
 * endpoints in later phases).
 */
export function verifyAppJwt(token: string): VerifiedClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest();
  let actual: Buffer;
  try { actual = b64urlDecode(s); } catch { return null; }
  if (expected.length !== actual.length) return null;
  if (!timingSafeEqual(expected, actual)) return null;
  let payload: VerifiedClaims;
  try { payload = JSON.parse(b64urlDecode(p).toString('utf8')); }
  catch { return null; }
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

/**
 * Constant-time string equality. Both inputs hashed first so a length
 * mismatch doesn't leak the secret length via timing.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  const { createHash } = require('crypto') as typeof import('crypto');
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}
