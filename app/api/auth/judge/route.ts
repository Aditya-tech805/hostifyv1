// POST /api/auth/judge
//
// Verifies the judges PIN AND captures the judge's display name in one
// shot - the name is baked into the JWT (judge_name claim) so RLS can
// require that a judge only writes to scores/{their_name}/* rows.

import { NextResponse } from 'next/server';
import { signAppJwt, constantTimeEquals } from '@/lib/jwt';

export const runtime = 'nodejs';

const NAME_RE = /^[\p{L}\p{N} .'-]{2,48}$/u;

// Built from String.fromCharCode at runtime so the source file stays pure
// ASCII (no hostile invisible chars sneaking into our own codebase).
// Strips: C0 controls + DEL + C1 controls + zero-width + bidi-overrides +
// invisible separators + word-joiner range + BOM.
const INVISIBLE_RE = new RegExp(
  '[' +
    '\\u0000-\\u001F' +   // C0 controls
    '\\u007F-\\u009F' +   // DEL + C1 controls
    '\\u200B-\\u200F' +   // zero-width space/joiner/non-joiner + LRM/RLM
    '\\u202A-\\u202E' +   // LRE/RLE/PDF/LRO/RLO (bidi overrides)
    '\\u2060-\\u206F' +   // word joiner + invisible math operators
    '\\uFEFF' +           // BOM / zero-width no-break space
  ']',
  'g',
);

function sanitizeName(raw: string): string {
  return raw.replace(INVISIBLE_RE, '').replace(/\s+/g, ' ').trim();
}

export async function POST(req: Request) {
  const PIN = process.env.JUDGE_PIN;
  if (!PIN) {
    return NextResponse.json(
      { error: 'Server PIN not configured. Ask the operator to set JUDGE_PIN.' },
      { status: 500 },
    );
  }

  let body: { pin?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const pin = typeof body.pin === 'string' ? body.pin : '';
  const rawName = typeof body.name === 'string' ? body.name : '';
  const name = sanitizeName(rawName);

  if (!/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ error: 'Invalid PIN format.' }, { status: 400 });
  }
  if (!NAME_RE.test(name)) {
    return NextResponse.json(
      { error: 'Invalid name. 2-48 letters, digits, spaces, . - or apostrophe.' },
      { status: 400 },
    );
  }
  if (!constantTimeEquals(pin, PIN)) {
    return NextResponse.json({ error: 'Wrong PIN.' }, { status: 401 });
  }

  const { token, exp } = signAppJwt({ app_role: 'judge', judge_name: name });
  return NextResponse.json({ token, exp, app_role: 'judge', judge_name: name });
}
