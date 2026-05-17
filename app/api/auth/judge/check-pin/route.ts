// POST /api/auth/judge/check-pin
//
// Verifies the judges PIN without issuing a token. Used by the two-stage
// judge sign-in flow so the user gets immediate feedback that their PIN is
// correct before being asked for their name. The actual JWT is issued by
// /api/auth/judge once the name is provided.

import { NextResponse } from 'next/server';
import { constantTimeEquals } from '@/lib/jwt';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const PIN = process.env.JUDGE_PIN;
  if (!PIN) {
    return NextResponse.json({ error: 'Server PIN not configured.' }, { status: 500 });
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
  return NextResponse.json({ ok: true });
}
