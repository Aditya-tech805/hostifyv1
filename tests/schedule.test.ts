import { describe, expect, it } from 'vitest';
import { EVENT, numberWord, to12h } from '@/config/event';
import { SCHEDULE, formatCountdown, formatHHMMSS, getPhaseState } from '@/lib/schedule';

const first = SCHEDULE[0];
const last = SCHEDULE[SCHEDULE.length - 1];

describe('SCHEDULE (derived from config/event.ts)', () => {
  it('has one phase per configured entry, in order and without gaps', () => {
    expect(SCHEDULE.map((p) => p.id)).toEqual(EVENT.schedule.map((p) => p.id));
    for (let i = 1; i < SCHEDULE.length; i++) {
      expect(SCHEDULE[i].start).toBe(SCHEDULE[i - 1].end);
    }
  });

  it('anchors times to the configured timezone', () => {
    const expected = new Date(`${EVENT.date}T${EVENT.schedule[0].start}:00${EVENT.tz}`).getTime();
    expect(first.start).toBe(expected);
  });
});

describe('getPhaseState', () => {
  it('is "pre" before doors open, pointing at the first phase', () => {
    expect(getPhaseState(new Date(first.start - 1))).toEqual({ status: 'pre', next: first });
  });

  it('is "live" inside a phase and reports the next one', () => {
    const state = getPhaseState(new Date(SCHEDULE[1].start + 1000));
    expect(state.status).toBe('live');
    expect(state.phase?.id).toBe(SCHEDULE[1].id);
    expect(state.next?.id).toBe(SCHEDULE[2].id);
  });

  it('is "post" once the last phase ends', () => {
    expect(getPhaseState(new Date(last.end)).status).toBe('post');
  });

  it('lets the coordinator override win over the clock', () => {
    const state = getPhaseState(new Date(first.start - 1), 'phase3');
    expect(state.status).toBe('override');
    expect(state.phase?.id).toBe('phase3');
  });
});

describe('formatting helpers', () => {
  it('formats countdowns by magnitude', () => {
    expect(formatCountdown(-5)).toBe('0s');
    expect(formatCountdown(65_000)).toBe('1m 05s');
    expect(formatCountdown(3_725_000)).toBe('1h 02m 05s');
    expect(formatCountdown(90_000_000)).toBe('1d 1h 0m');
    expect(formatHHMMSS(3_725_000)).toBe('01:02:05');
  });

  it('spells team counts and converts to 12-hour time', () => {
    expect(numberWord(24)).toBe('twenty-four');
    expect(numberWord(30)).toBe('thirty');
    expect(numberWord(120)).toBe('120');
    expect(to12h('09:30')).toBe('9:30 AM');
    expect(to12h('16:15')).toBe('4:15 PM');
    expect(to12h('00:05')).toBe('12:05 AM');
  });
});
