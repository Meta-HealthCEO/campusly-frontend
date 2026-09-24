import { describe, expect, it } from 'vitest';
import {
  annotatePeriods,
  assignLessonsToPeriods,
  lessonsByClassForDay,
  nowLinePlacement,
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

describe('nowLinePlacement', () => {
  const day: TodayPeriod[] = [
    { startTime: '07:45', endTime: '08:30' },
    { startTime: '08:30', endTime: '09:15' },
    { startTime: '10:30', endTime: '11:15' },
  ].map((p, i) => ({ timetableId: `t${i}`, classId: 'c', className: 'Gr 1 A', subjectName: 'English', period: i + 1, room: null, recorded: false, recordedCount: 0, ...p }));
  const at = (hh: number, mm: number) => new Date(2026, 8, 24, hh, mm);
  const annotated = (d: Date) => annotatePeriods(day, d);

  it('sits between the last finished period and the next one', () => {
    expect(nowLinePlacement(annotated(at(10, 12)), at(10, 12))).toEqual({ index: 2, label: '10:12' });
  });

  it('sits just below a period that is under way', () => {
    expect(nowLinePlacement(annotated(at(8, 45)), at(8, 45))).toEqual({ index: 2, label: '08:45' });
  });

  it('is hidden before school and after the last period', () => {
    expect(nowLinePlacement(annotated(at(7, 0)), at(7, 0))).toBeNull();
    expect(nowLinePlacement(annotated(at(11, 15)), at(11, 15))).toBeNull();
  });

  it('is hidden on a day with no periods', () => {
    expect(nowLinePlacement([], at(9, 0))).toBeNull();
  });
});

describe('assignLessonsToPeriods', () => {
  const day = new Date(2026, 8, 24, 6, 0);
  const at = (hh: number, mm: number) => new Date(2026, 8, 24, hh, mm).toISOString();
  const periods = annotatePeriods([
    period(1, '07:45', '08:30'),
    { ...period(2, '08:30', '09:15'), classId: 'c1' },
    { ...period(3, '09:15', '10:00'), classId: 'c1' },
  ].map((p) => ({ ...p, classId: p.classId === 'c1' || p.period === 1 ? 'c1' : p.classId })), day);

  it('puts a timed lesson only on the period it is scheduled for', () => {
    const map = assignLessonsToPeriods(periods, [
      { id: 'L1', title: 'Phonics', assignedClasses: [{ classId: 'c1', scheduledDate: at(8, 30) }] },
    ], day);
    expect(map.get('t2')?.title).toBe('Phonics');
    expect(map.has('t1')).toBe(false);
    expect(map.has('t3')).toBe(false);
  });

  it("gives each of a class's periods its own lesson", () => {
    const map = assignLessonsToPeriods(periods, [
      { id: 'L1', title: 'Phonics', assignedClasses: [{ classId: 'c1', scheduledDate: at(8, 30) }] },
      { id: 'L2', title: 'Number line', assignedClasses: [{ classId: 'c1', scheduledDate: at(9, 15) }] },
    ], day);
    expect(map.get('t2')?.title).toBe('Phonics');
    expect(map.get('t3')?.title).toBe('Number line');
  });

  it("puts a lesson with no time on the class's first period of the day only", () => {
    const map = assignLessonsToPeriods(periods, [
      { id: 'L3', title: 'Reading', assignedClasses: [{ classId: 'c1', scheduledDate: new Date(2026, 8, 24).toISOString() }] },
    ], day);
    expect(map.get('t1')?.title).toBe('Reading');
    expect([...map.keys()]).toEqual(['t1']);
  });

  it('ignores lessons for other days', () => {
    const map = assignLessonsToPeriods(periods, [
      { id: 'L4', title: 'Tomorrow', assignedClasses: [{ classId: 'c1', scheduledDate: new Date(2026, 8, 25, 8, 30).toISOString() }] },
    ], day);
    expect(map.size).toBe(0);
  });
});
