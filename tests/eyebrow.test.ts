import { describe, expect, it } from 'vitest';
import { todayEyebrow, todayLede } from '../src/lib/eyebrow';
import type { AnnotatedPeriod } from '../src/lib/teacher-today';

const p = (period: number, startTime: string, phase: AnnotatedPeriod['phase'], subjectName = 'English', className = 'Grade 1 - A'): AnnotatedPeriod =>
  ({ timetableId: `t${period}`, classId: 'c', className, subjectName, period, startTime, endTime: '23:59', room: null, recorded: false, recordedCount: 0, phase }) as AnnotatedPeriod;

describe('todayEyebrow', () => {
  it('names the day in short caps', () => {
    expect(todayEyebrow(new Date(2026, 8, 24, 9, 0))).toBe('THU 24 SEP');
  });
});

describe('todayLede', () => {
  it('says how many periods and what is next', () => {
    expect(todayLede([p(1, '07:45', 'done'), p(2, '10:45', 'next', 'Life Skills', 'Grade R - A'), p(3, '12:00', 'later')]))
      .toBe('Three periods today. Next up: Life Skills with Grade R - A at 10:45.');
  });

  it('says what is on now during a period', () => {
    expect(todayLede([p(1, '07:45', 'now', 'Mathematics')])).toBe('One period today. On now: Mathematics with Grade 1 - A.');
  });

  it('wraps up after the last period', () => {
    expect(todayLede([p(1, '07:45', 'done'), p(2, '08:30', 'done')])).toBe('Two periods today, all done.');
  });

  it('says nothing on an empty day', () => {
    expect(todayLede([])).toBeNull();
  });
});
