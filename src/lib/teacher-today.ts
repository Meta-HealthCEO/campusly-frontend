import { toISODate } from './utils';

/** One timetable period from GET /attendance/register-status. */
export interface TodayPeriod {
  timetableId: string;
  classId: string;
  className: string;
  subjectName: string;
  period: number;
  startTime: string;
  endTime: string;
  room: string | null;
  recorded: boolean;
  recordedCount: number;
}

export type PeriodPhase = 'done' | 'now' | 'next' | 'later';

export interface AnnotatedPeriod extends TodayPeriod {
  phase: PeriodPhase;
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Tags each period done / now / next / later against the local clock. */
export function annotatePeriods(periods: TodayPeriod[], now: Date = new Date()): AnnotatedPeriod[] {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let nextAssigned = false;
  return periods.map((p) => {
    const start = minutesOf(p.startTime);
    const end = minutesOf(p.endTime);
    if (nowMin >= end) return { ...p, phase: 'done' };
    if (nowMin >= start) return { ...p, phase: 'now' };
    if (!nextAssigned) {
      nextAssigned = true;
      return { ...p, phase: 'next' };
    }
    return { ...p, phase: 'later' };
  });
}

interface ClassRef { id?: string; _id?: string; name?: string }

export interface LessonForDayInput {
  id?: string;
  _id?: string;
  title: string;
  assignedClasses?: Array<{ classId: string | ClassRef; scheduledDate: string }>;
}

export interface LessonLink {
  lessonId: string;
  title: string;
}

/** classId → the lesson scheduled for that class on `day` (local calendar day). */
export function lessonsByClassForDay(
  lessons: readonly LessonForDayInput[],
  day: Date,
): Map<string, LessonLink> {
  const target = toISODate(day);
  const map = new Map<string, LessonLink>();
  for (const lesson of lessons) {
    const lessonId = lesson.id ?? lesson._id ?? '';
    for (const assignment of lesson.assignedClasses ?? []) {
      const scheduled = new Date(assignment.scheduledDate);
      if (Number.isNaN(scheduled.getTime()) || toISODate(scheduled) !== target) continue;
      const ref = assignment.classId;
      const classId = typeof ref === 'string' ? ref : ref.id ?? ref._id ?? '';
      if (classId && !map.has(classId)) map.set(classId, { lessonId, title: lesson.title });
    }
  }
  return map;
}

function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** The "3 periods · 1 register still open · 12 to mark" line under the greeting. */
export function summariseToday(input: {
  periods: AnnotatedPeriod[];
  markingPending: number;
  unreadMessages: number;
}): string[] {
  const openRegisters = input.periods.filter(
    (p) => !p.recorded && (p.phase === 'done' || p.phase === 'now'),
  ).length;
  const parts: string[] = [];
  if (input.periods.length > 0) parts.push(count(input.periods.length, 'period'));
  if (openRegisters > 0) {
    parts.push(`${count(openRegisters, 'register')} still open`);
  }
  if (input.markingPending > 0) parts.push(`${input.markingPending} to mark`);
  if (input.unreadMessages > 0) parts.push(count(input.unreadMessages, 'unread message'));
  return parts;
}
