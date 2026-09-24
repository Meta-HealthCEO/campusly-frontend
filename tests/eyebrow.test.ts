import { describe, expect, it } from 'vitest';
import { contextEyebrow, sectionEyebrow, todayEyebrow, todayLede, weekOfEyebrow } from '../src/lib/eyebrow';
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

  it('after the last period, counts the registers still to take', () => {
    const periods = [p(1, '07:45', 'done'), p(2, '08:30', 'done'), { ...p(3, '09:15', 'done'), recorded: true }];
    expect(todayLede(periods)).toBe('Three periods today. 2 registers still to take.');
    expect(todayLede([p(1, '07:45', 'done')])).toBe('One period today. 1 register still to take.');
  });

  it('after the last period, says so when every register is taken', () => {
    const periods = [{ ...p(1, '07:45', 'done'), recorded: true }, { ...p(2, '08:30', 'done'), recorded: true }];
    expect(todayLede(periods)).toBe('Two periods today. All registers taken.');
  });

  it('says nothing on an empty day', () => {
    expect(todayLede([])).toBeNull();
  });
});

describe('sectionEyebrow', () => {
  it('names the nav section in caps', () => {
    expect(sectionEyebrow('Assess')).toBe('ASSESS');
  });
});

describe('weekOfEyebrow', () => {
  it('names the Monday of the week', () => {
    expect(weekOfEyebrow(new Date(2026, 8, 24))).toBe('WEEK OF 21 SEP');
  });

  it('keeps a Monday as its own week', () => {
    expect(weekOfEyebrow(new Date(2026, 8, 21, 7, 0))).toBe('WEEK OF 21 SEP');
  });

  it('rolls a Sunday back to the Monday before', () => {
    expect(weekOfEyebrow(new Date(2026, 8, 27))).toBe('WEEK OF 21 SEP');
  });
});

describe('contextEyebrow', () => {
  it('joins the known parts in caps', () => {
    expect(contextEyebrow(['Grade 1 - A', 'Period 1'])).toBe('GRADE 1 - A · PERIOD 1');
  });

  it('skips missing parts and falls back when none are known', () => {
    expect(contextEyebrow([null, '', undefined], 'Class')).toBe('CLASS');
    expect(contextEyebrow(['Grade 1 - A', null])).toBe('GRADE 1 - A');
  });
});
