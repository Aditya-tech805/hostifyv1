// POST /api/team/update
//
// Phase 3 — edit an existing team. Requires a Bearer team JWT in the
// Authorization header (issued by /api/team/register). The team_id baked
// into the JWT is the only team the caller can update. Server validates
// + sanitizes the same way as /register.

import { NextResponse } from 'next/server';
import { signAppJwt, verifyAppJwt } from '@/lib/jwt';
import { sanitizeTeamFields, validateTeamFields } from '@/lib/team-validate';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return NextResponse.json({ error: 'Missing bearer token.' }, { status: 401 });
  }
  const claims = verifyAppJwt(m[1]);
  if (!claims || claims.app_role !== 'team' || !claims.team_id) {
    return NextResponse.json({ error: 'Invalid team token.' }, { status: 401 });
  }
  const teamId = claims.team_id;

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Preserve the original registeredAt by reading the existing row first.
  // If the row doesn't exist (legacy team that registered pre-Phase-3 and
  // somehow has a token), we'll stamp a fresh timestamp.
  let registeredAt = Date.now();
  let teamRowExists = false;

  if (url && anonKey) {
    // Sign a fresh write-capable token using the same claims. Reusing m[1]
    // is fine too; we sign fresh to keep this route stateless.
    const readResp = await fetch(
      `${url}/rest/v1/kv?path=eq.teams/${teamId}&select=value`,
      {
        headers: { apikey: anonKey, Authorization: `Bearer ${m[1]}` },
      },
    );
    if (readResp.ok) {
      const rows = (await readResp.json()) as Array<{ value?: { registeredAt?: number } }>;
      if (rows[0]?.value?.registeredAt) {
        registeredAt = rows[0].value.registeredAt;
        teamRowExists = true;
      }
    }
  }

  const team = {
    id: teamId,
    name: clean.name,
    color: clean.color,
    members: clean.members,
    idea: clean.idea,
    registeredAt,
  };

  // If no Supabase, treat as localStorage-only mode — client persists locally.
  if (!url || !anonKey) {
    return NextResponse.json({ team });
  }

  // We need an INSERT if the row doesn't exist (Prefer: resolution=merge-duplicates
  // makes POST act as upsert). Otherwise PATCH. POST upsert keeps it one path.
  const resp = await fetch(`${url}/rest/v1/kv`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${m[1]}`,
      'content-type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ path: `teams/${teamId}`, value: team }),
  });

  if (!resp.ok) {
    const details = await resp.text();
    return NextResponse.json(
      { error: 'Failed to update team row.', details: details.slice(0, 400) },
      { status: 502 },
    );
  }

  // Refresh the token if it's close to expiring — keeps long event-day
  // sessions alive. The claim set is the same, only iat/exp change.
  const nowSec = Math.floor(Date.now() / 1000);
  const remaining = claims.exp - nowSec;
  let refreshed: { token: string; exp: number } | null = null;
  if (remaining < 3600) {
    refreshed = signAppJwt({ app_role: 'team', team_id: teamId });
  }

  return NextResponse.json({ team, teamRowExists, ...(refreshed ?? {}) });
}
