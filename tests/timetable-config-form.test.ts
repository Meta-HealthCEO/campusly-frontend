import { describe, expect, it } from 'vitest';
import { periodConfigForm } from '../src/lib/timetable-config';
import type { TimetableConfig } from '../src/types';

const saved: TimetableConfig = {
  id: 'c1',
  periodsPerDay: { monday: 5, tuesday: 5, wednesday: 5, thursday: 5, friday: 5 },
  periodTimes: [{ period: 1, startTime: '07:45', endTime: '08:30' }],
  breakSlots: [{ afterPeriod: 3, duration: 30, label: 'Break' }],
};

describe('periodConfigForm', () => {
  it('fills in the year and term a saved config left out, so the inputs stay controlled', () => {
    const form = periodConfigForm(saved, 2026);
    expect(form.academicYear).toBe(2026);
    expect(form.term).toBe(1);
    expect(form.periodTimes).toEqual(saved.periodTimes);
  });

  it('keeps the year and term the school saved', () => {
    expect(periodConfigForm({ ...saved, academicYear: 2027, term: 3 }, 2026)).toMatchObject({ academicYear: 2027, term: 3 });
  });

  it('starts a school with no config on seven periods a day', () => {
    const form = periodConfigForm(null, 2026);
    expect(form.periodsPerDay.monday).toBe(7);
    expect(form.periodTimes).toEqual([]);
    expect(form.breakSlots).toEqual([]);
  });
});
