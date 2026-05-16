import { readJSON, writeJSON, STORAGE_KEYS } from './storage';

export interface Team {
  id: string;
  name: string;
  color: string;
  members: string[];
  idea: string;
  registeredAt: number;
}

export const TEAM_COLORS: { name: string; hex: string }[] = [
  { name: 'violet', hex: '#7c3aed' },
  { name: 'lime',   hex: '#84cc16' },
  { name: 'coral',  hex: '#f97316' },
  { name: 'sky',    hex: '#0ea5e9' },
  { name: 'rose',   hex: '#f43f5e' },
  { name: 'amber',  hex: '#fbbf24' },
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
