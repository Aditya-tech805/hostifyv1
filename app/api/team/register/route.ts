// POST /api/team/register
//
// Phase 3 — creates a team server-side. The server:
//   1. Validates + sanitizes the form input (length caps, color allowlist,
//      strip control / zero-width / bidi-override chars).
//   2. Generates the team_id (clients no longer pick their own; we use
//      randomBytes so collisions are negligible).
//   3. Signs a team JWT bound to that team_id and uses it to write the row
//      into the kv table. Phase 3's RLS only accepts the write when the
//      JWT's team_id claim matches the path segment.
//   4. Returns { team, token, exp } so the client can store the token for
//      future updates (no longer writes to Supabase directly).

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { signAppJwt } from '@/lib/jwt';
import { sanitizeTeamFields, validateTeamFields } from '@/lib/team-validate';

export const runtime = 'nodejs';

function newTeamId(): string {
  return 'team-' + randomBytes(6).toString('hex'); // 12 hex chars
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const clean = sanitizeTeamFields(body);
  const validation = validateTeamFields(clean);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const teamId = newTeamId();
  const team = {
    id: teamId,
    name: clean.name,
    color: clean.color,
    members: clean.members,
    idea: clean.idea,
    registeredAt: Date.now(),
  };

  const { token, exp } = signAppJwt({ app_role: 'team', team_id: teamId });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // localStorage-only mode (no Supabase configured): just hand the team +
  // token back. Client persists locally — works for dev / single-device.
  if (!url || !anonKey) {
    return NextResponse.json({ team, token, exp });
  }

  const resp = await fetch(`${url}/rest/v1/kv`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      // upsert behavior — but team_id is fresh so this is effectively insert
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ path: `teams/${teamId}`, value: team }),
  });

  if (!resp.ok) {
    const details = await resp.text();
    return NextResponse.json(
      { error: 'Failed to write team row.', details: details.slice(0, 400) },
      { status: 502 },
    );
  }

  return NextResponse.json({ team, token, exp });
}
