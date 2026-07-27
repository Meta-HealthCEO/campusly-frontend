import { describe, it, expect } from 'vitest';
import {
  computeRemainingSeconds,
  formatCountdown,
  timerUrgency,
} from '../src/lib/test-timer';

const T0 = Date.parse('2026-07-27T08:00:00.000Z');
const MIN = 60_000;

describe('computeRemainingSeconds', () => {
  it('returns the full duration at the moment the test starts', () => {
    expect(
      computeRemainingSeconds('2026-07-27T08:00:00.000Z', 60, T0),
    ).toBe(3600);
  });

  it('counts down as time passes', () => {
    expect(
      computeRemainingSeconds('2026-07-27T08:00:00.000Z', 60, T0 + 15 * MIN),
    ).toBe(2700);
  });

  it('clamps to zero once the duration is exhausted', () => {
    expect(
      computeRemainingSeconds('2026-07-27T08:00:00.000Z', 60, T0 + 61 * MIN),
    ).toBe(0);
  });

  it('returns null for a missing startedAt (untimed fallback)', () => {
    expect(computeRemainingSeconds(null, 60, T0)).toBeNull();
  });

  it('returns null for an unparseable startedAt', () => {
    expect(computeRemainingSeconds('not-a-date', 60, T0)).toBeNull();
  });

  it('returns null for a non-positive duration (untimed paper)', () => {
    expect(computeRemainingSeconds('2026-07-27T08:00:00.000Z', 0, T0)).toBeNull();
  });
});

describe('formatCountdown', () => {
  it('formats an hour-plus remainder as h:mm:ss', () => {
    expect(formatCountdown(3661)).toBe('1:01:01');
  });

  it('formats sub-hour values as m:ss', () => {
    expect(formatCountdown(645)).toBe('10:45');
  });

  it('formats the final minute as 0:ss', () => {
    expect(formatCountdown(9)).toBe('0:09');
  });

  it('never renders negative time', () => {
    expect(formatCountdown(-5)).toBe('0:00');
  });
});

describe('timerUrgency', () => {
  it('is calm with plenty of time left', () => {
    expect(timerUrgency(1800)).toBe('normal');
  });

  it('warns inside the five-minute window', () => {
    expect(timerUrgency(299)).toBe('warning');
  });

  it('is critical inside the final minute', () => {
    expect(timerUrgency(59)).toBe('critical');
  });

  it('boundary: exactly five minutes is still normal', () => {
    expect(timerUrgency(300)).toBe('normal');
  });

  it('boundary: exactly one minute is warning, not critical', () => {
    expect(timerUrgency(60)).toBe('warning');
  });
});
