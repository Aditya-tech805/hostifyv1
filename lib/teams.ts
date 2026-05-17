import { readJSON, writeJSON, STORAGE_KEYS } from './storage';

export interface Team {
  id: string;
  name: string;
  color: string;
  members: string[];
  idea: string;
  registeredAt: number;
}

// All six colours are drawn straight from the app's brand palette (see
// tailwind.config.ts) so registered teams blend naturally with the rest
// of the UI. ALLOWED_TEAM_COLORS in lib/team-validate.ts MUST be kept in
// sync with these values - the server validates that the registered hex
// is one of these exact strings.
export const TEAM_COLORS: { name: string; hex: string }[] = [
  { name: 'indigo', hex: '#6366F1' }, // primary
  { name: 'violet', hex: '#A78BFA' }, // secondary
  { name: 'cyan',   hex: '#22D3EE' }, // accent
  { name: 'amber',  hex: '#FBBF24' }, // spark
  { name: 'lime',   hex: '#84CC16' },
  { name: 'rose',   hex: '#F87171' },
];

/** Reads the team registered on THIS device (single-team-per-device for now). */
export function readOwnTeam(): Team | null {
  return readJSON<Team | null>(STORAGE_KEYS.team, null);
}

export function writeOwnTeam(team: Team): void {
  writeJSON(STORAGE_KEYS.team, team);
}

/** Returns own team + any mock teams seeded via DevTools. Firebase later. */
export function readAllTeams(): Team[] {
  const teams: Team[] = [];
  const own = readOwnTeam();
  if (own) teams.push(own);
  const mock = readJSON<Team[]>(STORAGE_KEYS.mockTeams, []);
  if (Array.isArray(mock)) teams.push(...mock);
  return teams;
}
