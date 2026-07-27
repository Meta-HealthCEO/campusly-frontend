import { describe, it, expect } from 'vitest';
import {
  timeToMinutes,
  minutesToTime,
  generateDefaultTimes,
  validateSchedule,
} from '../src/lib/period-schedule';

const period = (n: number, startTime: string, endTime: string) => ({
  period: n,
  startTime,
  endTime,
});

describe('time conversions', () => {
  it('round-trips HH:mm through minutes', () => {
    expect(minutesToTime(timeToMinutes('07:45'))).toBe('07:45');
  });

  it('converts midnight and end-of-day correctly', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('23:59')).toBe(23 * 60 + 59);
  });
});

describe('generateDefaultTimes', () => {
  it('produces the requested number of sequential periods', () => {
    const times = generateDefaultTimes(4);
    expect(times).toHaveLength(4);
    expect(times.map((t) => t.period)).toEqual([1, 2, 3, 4]);
    for (let i = 1; i < times.length; i++) {
      expect(timeToMinutes(times[i].startTime)).toBeGreaterThanOrEqual(
        timeToMinutes(times[i - 1].endTime),
      );
    }
  });
});

describe('validateSchedule', () => {
  const goodTimes = [
    period(1, '08:00', '08:40'),
    period(2, '08:40', '09:20'),
  ];

  it('accepts a valid sequential schedule with no breaks', () => {
    expect(validateSchedule(goodTimes, [], 2)).toBeNull();
  });

  it('rejects a count mismatch', () => {
    expect(validateSchedule(goodTimes, [], 3)).toMatch(/exactly 3/);
  });

  it('rejects non-sequential period numbering', () => {
    const bad = [period(1, '08:00', '08:40'), period(3, '08:40', '09:20')];
    expect(validateSchedule(bad, [], 2)).toBe('Periods must run sequentially from P1.');
  });

  it('rejects a period that ends before it starts', () => {
    const bad = [period(1, '09:00', '08:00')];
    expect(validateSchedule(bad, [], 1)).toBe('P1 must end after it starts.');
  });

  it('rejects overlapping periods', () => {
    const bad = [period(1, '08:00', '08:50'), period(2, '08:40', '09:20')];
    expect(validateSchedule(bad, [], 2)).toBe('P2 overlaps P1.');
  });

  it('accepts one valid break between periods', () => {
    const breaks = [{ label: 'Recess', duration: 20, afterPeriod: 1 }];
    expect(validateSchedule(goodTimes, breaks, 2)).toBeNull();
  });

  it('rejects unlabeled breaks', () => {
    const breaks = [{ label: '  ', duration: 20, afterPeriod: 1 }];
    expect(validateSchedule(goodTimes, breaks, 2)).toBe('Each break needs a label.');
  });

  it('rejects out-of-range break durations', () => {
    const breaks = [{ label: 'Recess', duration: 120, afterPeriod: 1 }];
    expect(validateSchedule(goodTimes, breaks, 2)).toMatch(/between 5 and 90/);
  });

  it('rejects a break after the final period', () => {
    const breaks = [{ label: 'Recess', duration: 20, afterPeriod: 2 }];
    expect(validateSchedule(goodTimes, breaks, 2)).toMatch(/valid period/);
  });

  it('rejects duplicate breaks after the same period', () => {
    const breaks = [
      { label: 'Recess', duration: 20, afterPeriod: 1 },
      { label: 'Second', duration: 10, afterPeriod: 1 },
    ];
    expect(validateSchedule(goodTimes, breaks, 2)).toBe('Only one break can be placed after P1.');
  });
});
