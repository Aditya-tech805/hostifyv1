// POST /api/auth/coordinator
//
// Verifies the coordinator PIN server-side (PIN lives in COORD_PIN env var,
// never in the client bundle). On success, returns a JWT signed with the
// Supabase JWT secret so it doubles as a Supabase auth token — RLS policies
// authorize coordinator-scoped writes by reading `auth.jwt() ->> 'app_role'`.

import { NextResponse } from 'next/server';
import { signAppJwt, constantTimeEquals } from '@/lib/jwt';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const PIN = process.env.COORD_PIN;
  if (!PIN) {
    return NextResponse.json(
      { error: 'Server PIN not configured. Ask the operator to set COORD_PIN.' },
      { status: 500 },
    );
  }

  let body: { pin?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const pin = typeof body.pin === 'string' ? body.pin : '';
  if (!/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ error: 'Invalid PIN format.' }, { status: 400 });
  }

  if (!constantTimeEquals(pin, PIN)) {
    return NextResponse.json({ error: 'Wrong PIN.' }, { status: 401 });
  }

  const { token, exp } = signAppJwt({ app_role: 'coordinator' });
  return NextResponse.json({ token, exp, app_role: 'coordinator' });
}
