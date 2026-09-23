import { describe, expect, it } from 'vitest';
import { computePublicReveal, topThree, withStage, type FinalRanking, type FinalResults } from '@/lib/awards';

const rankings: FinalRanking[] = [
  { rank: 1, teamName: 'Northwind', marks: 42 },
  { rank: 2, teamName: 'ByteForge', marks: 40.33 },
  { rank: 3, teamName: 'Sentinels', marks: 38 },
  { rank: 4, teamName: 'Lumen', marks: 35.5 },
  { rank: -1, teamName: 'Offside', marks: 0, disqualified: true },
];

const at = (stage: FinalResults['stage']): FinalResults => ({ rankings, stage });
const names = (r: FinalResults) => r.rankings.map((x) => x.teamName);

describe('computePublicReveal', () => {
  it('exposes nothing while the ceremony is idle', () => {
    expect(computePublicReveal(at('idle')).rankings).toEqual([]);
  });

  it('reveals only third place at the third stage', () => {
    expect(names(computePublicReveal(at('third')))).toEqual(['Sentinels']);
  });

  it('adds second place without leaking the winner', () => {
    const visible = names(computePublicReveal(at('second')));
    expect(visible).toEqual(['ByteForge', 'Sentinels']);
    expect(visible).not.toContain('Northwind');
  });

  it('shows the podium, but not the rest of the field, at the first stage', () => {
    const visible = names(computePublicReveal(at('first')));
    expect(visible.sort()).toEqual(['ByteForge', 'Northwind', 'Sentinels']);
    expect(visible).not.toContain('Lumen');
  });

  it('shows every team, including disqualified ones, on the leaderboard', () => {
    expect(computePublicReveal(at('leaderboard')).rankings).toHaveLength(rankings.length);
  });

  it('never reveals a disqualified team on the podium stages', () => {
    const dqOnPodium: FinalRanking[] = [{ rank: 3, teamName: 'Ghost', marks: 50, disqualified: true }, ...rankings];
    const r = computePublicReveal({ rankings: dqOnPodium, stage: 'first' });
    expect(names(r)).not.toContain('Ghost');
  });

  it('keeps reveal timestamps so animations can replay', () => {
    const r = computePublicReveal({ rankings, stage: 'third', revealedAt: { third: 123 } });
    expect(r.revealedAt).toEqual({ third: 123 });
  });
});

describe('withStage', () => {
  it('starts an empty ceremony when there are no results yet', () => {
    expect(withStage(null, 'third', 10)).toEqual({ rankings: [], stage: 'third', revealedAt: { third: 10 } });
  });

  it('changes the stage without touching rankings and keeps earlier timestamps', () => {
    const next = withStage({ rankings, stage: 'third', revealedAt: { third: 10 } }, 'second', 20);
    expect(next.rankings).toBe(rankings);
    expect(next.stage).toBe('second');
    expect(next.revealedAt).toEqual({ third: 10, second: 20 });
  });
});

describe('topThree', () => {
  it('picks the podium by rank, skipping disqualified entries', () => {
    const { first, second, third } = topThree(at('leaderboard'));
    expect([first?.teamName, second?.teamName, third?.teamName]).toEqual(['Northwind', 'ByteForge', 'Sentinels']);
  });

  it('returns nothing for missing results', () => {
    expect(topThree(null)).toEqual({});
  });
});
