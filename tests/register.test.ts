import { describe, it, expect } from 'vitest';
import { defaultRegister, registerPeriodOptions } from '../src/lib/register';

const classes = [{ id: 'c1' }, { id: 'c2' }];

describe('defaultRegister', () => {
  it('opens the first class, today (local date) and period 1 when nothing is chosen', () => {
    // 00:30 on 26 September in South Africa is still 25 September in UTC.
    const today = new Date(2026, 8, 26, 0, 30);
    expect(defaultRegister(classes, new URLSearchParams(), today)).toEqual({ classId: 'c1', date: '2026-09-26', period: 1 });
  });

  it('keeps the class, date and period in the link', () => {
    const search = new URLSearchParams({ classId: 'c2', date: '2026-09-20', period: '3' });
    expect(defaultRegister(classes, search, new Date(2026, 8, 25, 10))).toEqual({ classId: 'c2', date: '2026-09-20', period: 3 });
  });

  it('ignores a class that is not the teacher\'s, a future or malformed date, and a bad period', () => {
    const search = new URLSearchParams({ classId: 'other', date: '2026-10-01', period: '0' });
    expect(defaultRegister(classes, search, new Date(2026, 8, 25, 10))).toEqual({ classId: 'c1', date: '2026-09-25', period: 1 });
    expect(defaultRegister(classes, new URLSearchParams({ date: '25/09/2026', period: '2.5' }), new Date(2026, 8, 25, 10)))
      .toEqual({ classId: 'c1', date: '2026-09-25', period: 1 });
  });

  it('has no class when the teacher has none', () => {
    expect(defaultRegister([], new URLSearchParams(), new Date(2026, 8, 25, 10)).classId).toBeNull();
  });
});

describe('periods beyond 8 (school timetables run to 12)', () => {
  it('keeps period 9 and 12 from the link', () => {
    const today = new Date(2026, 8, 25, 10);
    expect(defaultRegister(classes, new URLSearchParams({ period: '9' }), today).period).toBe(9);
    expect(defaultRegister(classes, new URLSearchParams({ period: '12' }), today).period).toBe(12);
    expect(defaultRegister(classes, new URLSearchParams({ period: '13' }), today).period).toBe(1);
  });

  it('offers lessons 1–8, plus the linked period when it is later', () => {
    expect(registerPeriodOptions(3)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(registerPeriodOptions(9)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(registerPeriodOptions(12)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 12]);
  });
});
