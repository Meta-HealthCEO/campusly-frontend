import { describe, expect, it } from 'vitest';
import {
  annotatePeriods,
  lessonsByClassForDay,
  summariseToday,
  type TodayPeriod,
} from '../src/lib/teacher-today';

function period(p: number, start: string, end: string, recorded = false): TodayPeriod {
  return {
    timetableId: `t${p}`, classId: `c${p}`, className: `10${p}`, subjectName: 'Maths',
    period: p, startTime: start, endTime: end, room: null, recorded, recordedCount: recorded ? 30 : 0,
  };
}

const day = [period(1, '08:00', '08:45', true), period(2, '10:00', '10:45'), period(3, '11:00', '11:45')];
const at = (h: number, m: number) => new Date(2026, 8, 23, h, m);

describe('annotatePeriods', () => {
  it('marks finished, current and next periods from the local clock', () => {
    const phases = annotatePeriods(day, at(10, 15)).map((p) => p.phase);

    expect(phases).toEqual(['done', 'now', 'next']);
  });

  it('makes the first period "next" before school starts', () => {
    expect(annotatePeriods(day, at(7, 0)).map((p) => p.phase)).toEqual(['next', 'later', 'later']);
  });

  it('marks everything done after the last bell', () => {
    expect(annotatePeriods(day, at(15, 0)).map((p) => p.phase)).toEqual(['done', 'done', 'done']);
  });
});

describe('lessonsByClassForDay', () => {
  const today = at(9, 0);

  it("maps each class to the lesson scheduled for it today", () => {
    const lessons = [
      {
        id: 'L1', title: 'Measures of central tendency',
        assignedClasses: [
          { classId: { id: 'c2', name: '102' }, scheduledDate: new Date(2026, 8, 23, 0, 0).toISOString() },
          { classId: 'c3', scheduledDate: new Date(2026, 8, 24, 0, 0).toISOString() },
        ],
      },
    ];

    const map = lessonsByClassForDay(lessons, today);

    expect(map.get('c2')).toEqual({ lessonId: 'L1', title: 'Measures of central tendency' });
    expect(map.has('c3')).toBe(false);
  });
});

describe('summariseToday', () => {
  it('counts only registers whose period has started, and skips zeros', () => {
    const periods = annotatePeriods(day, at(10, 15));

    expect(summariseToday({ periods, markingPending: 12, unreadMessages: 0 })).toEqual([
      '3 periods', '1 register still open', '12 to mark',
    ]);
  });

  it('pluralises and handles a quiet day', () => {
    expect(summariseToday({ periods: [], markingPending: 1, unreadMessages: 2 })).toEqual([
      '1 to mark', '2 unread messages',
    ]);
  });
});
