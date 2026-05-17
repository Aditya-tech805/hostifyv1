// POST /api/vote
//
// Phase 4 - audience-vote rate limit. Replaces the client-side castAudienceVote
// which used to write directly to kv (and could be spammed by clearing
// localStorage). After Phase 4, only this endpoint writes to audienceVotes/*.
//
// Voter identity is bound to a server-set HttpOnly cookie. One vote per
// (team, presenter window, cookie) is enforced by a UNIQUE constraint on
// public.vote_log; the API just inserts and lets the database say no.
//
// IP and User-Agent are logged as forensic context but NOT used for the
// uniqueness check - event WiFi NATs everyone behind one IP, so an
// IP-based limit would prevent legitimate votes.

import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { signAppJwt } from '@/lib/jwt';

export const runtime = 'nodejs';

const COOKIE_NAME = 'i26_v';
const COOKIE_MAX_AGE = 24 * 3600; // 24 hours

const CHOICES = new Set(['wow', 'cool', 'fine']);
type Choice = 'wow' | 'cool' | 'fine';

function extractCookie(header: string, name: string): string | null {
  // Use String concat instead of template literal so RegExp source is plain.
  const re = new RegExp('(?:^|;\\s*)' + name + '=([A-Za-z0-9_-]+)');
  const m = header.match(re);
  return m ? m[1] : null;
}

function buildCookieHeader(value: string): string {
  return `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const obj = (body ?? {}) as { teamId?: unknown; choice?: unknown };
  const teamId = typeof obj.teamId === 'string' ? obj.teamId.trim() : '';
  const choice = typeof obj.choice === 'string' ? obj.choice : '';

  // Team IDs are server-generated as 'team-' + 12 hex chars (Phase 3).
  // Legacy 8-char ids from earlier still need to vote, so accept 6-32 hex.
  if (!/^team-[a-f0-9]{6,32}$/i.test(teamId)) {
    return NextResponse.json({ error: 'Invalid team id.' }, { status: 400 });
  }
  if (!CHOICES.has(choice)) {
    return NextResponse.json({ error: 'Invalid choice.' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Supabase not configured.' }, { status: 500 });
  }

  // ─── Voter fingerprint ─────────────────────────────────────────────────
  const cookieHeader = req.headers.get('cookie') ?? '';
  let cookieUuid = extractCookie(cookieHeader, COOKIE_NAME);
  let setNewCookie = false;
  if (!cookieUuid) {
    cookieUuid = randomUUID();
    setNewCookie = true;
  }
  const fingerprint = createHash('sha256').update(cookieUuid).digest('hex');

  // ─── Read current presenter window (server is authoritative) ───────────
  // We trust upNext.startedAt as the "vote window" id. The client cannot
  // supply this - that would let it vote in stale windows.
  const upNextResp = await fetch(
    `${url}/rest/v1/kv?path=eq.upNext&select=value`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
  );
  if (!upNextResp.ok) {
    return NextResponse.json({ error: 'Could not read presenter state.' }, { status: 502 });
  }
  const upRows = (await upNextResp.json()) as Array<{ value?: { teamId?: string; startedAt?: number } }>;
  const upNext = upRows[0]?.value;
  if (!upNext || typeof upNext.teamId !== 'string' || typeof upNext.startedAt !== 'number') {
    return NextResponse.json({ error: 'No team is currently presenting.' }, { status: 409 });
  }
  if (upNext.teamId !== teamId) {
    return NextResponse.json({ error: 'That team is not on stage right now.' }, { status: 409 });
  }
  const presenterStartedAt = upNext.startedAt;

  // ─── Server-signed coordinator JWT for the privileged writes ───────────
  // 60-second TTL is plenty - the writes that follow take ~hundreds of ms.
  const { token: coordToken } = signAppJwt({ app_role: 'coordinator' }, 60);

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
  const ua = (req.headers.get('user-agent') ?? '').slice(0, 200) || null;

  // ─── Insert the vote log row ───────────────────────────────────────────
  const logResp = await fetch(`${url}/rest/v1/vote_log`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${coordToken}`,
      'content-type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      team_id: teamId,
      presenter_started_at: presenterStartedAt,
      voter_fingerprint: fingerprint,
      choice,
      voter_ip: ip,
      voter_ua: ua,
    }),
  });

  if (logResp.status === 409) {
    const res = NextResponse.json(
      { error: 'You\'ve already voted on this team.', alreadyVoted: true },
      { status: 409 },
    );
    if (setNewCookie) res.headers.set('Set-Cookie', buildCookieHeader(cookieUuid));
    return res;
  }
  if (!logResp.ok) {
    const details = (await logResp.text()).slice(0, 300);
    // Postgres unique-violation can sometimes surface as 400 with code 23505
    if (details.includes('23505')) {
      const res = NextResponse.json(
        { error: 'You\'ve already voted on this team.', alreadyVoted: true },
        { status: 409 },
      );
      if (setNewCookie) res.headers.set('Set-Cookie', buildCookieHeader(cookieUuid));
      return res;
    }
    return NextResponse.json({ error: 'Failed to record vote.', details }, { status: 502 });
  }

  // ─── Recompute the aggregate tally from vote_log (no race) ─────────────
  const tallyResp = await fetch(
    `${url}/rest/v1/vote_log?team_id=eq.${teamId}&presenter_started_at=eq.${presenterStartedAt}&select=choice`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${coordToken}` } },
  );
  if (!tallyResp.ok) {
    return NextResponse.json({ error: 'Vote logged but tally read failed.' }, { status: 502 });
  }
  const rows = (await tallyResp.json()) as Array<{ choice: Choice }>;
  const tally = { wow: 0, cool: 0, fine: 0 };
  for (const r of rows) {
    if (r.choice in tally) tally[r.choice]++;
  }

  // ─── Upsert audienceVotes/<teamId> ─────────────────────────────────────
  const aggResp = await fetch(`${url}/rest/v1/kv`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${coordToken}`,
      'content-type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ path: `audienceVotes/${teamId}`, value: tally }),
  });
  if (!aggResp.ok) {
    return NextResponse.json({ error: 'Vote logged but aggregate write failed.' }, { status: 502 });
  }

  const res = NextResponse.json({ ok: true, tally });
  if (setNewCookie) res.headers.set('Set-Cookie', buildCookieHeader(cookieUuid));
  return res;
}
