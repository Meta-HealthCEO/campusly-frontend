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

/**
 * Where today's "now" line goes (look-design spec §5.5): before the next
 * period, or just below one that's under way. Hidden before the first period
 * starts, once the last one ends, and on days with no periods.
 */
export function nowLinePlacement(periods: AnnotatedPeriod[], now: Date): { index: number; label: string } | null {
  if (periods.length === 0) return null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin < minutesOf(periods[0].startTime) || nowMin >= minutesOf(periods[periods.length - 1].endTime)) return null;
  const inProgress = periods.findIndex((p: AnnotatedPeriod) => p.phase === 'now');
  const index = inProgress >= 0 ? inProgress + 1 : periods.findIndex((p: AnnotatedPeriod) => p.phase === 'next');
  const label = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return { index: index < 0 ? periods.length : index, label };
}

/**
 * timetableId → the lesson for that period. A lesson scheduled at a time goes
 * on the period of its class that the time falls in; a lesson with no time
 * (midnight) goes on its class's first period of the day. Each lesson is used
 * once, so a class taught twice a day doesn't show one lesson twice.
 */
export function assignLessonsToPeriods(
  periods: readonly AnnotatedPeriod[],
  lessons: readonly LessonForDayInput[],
  day: Date,
): Map<string, LessonLink> {
  const target = toISODate(day);
  const entries: Array<{ classId: string; minutes: number | null; link: LessonLink; used: boolean }> = [];
  for (const lesson of lessons) {
    const lessonId = lesson.id ?? lesson._id ?? '';
    for (const assignment of lesson.assignedClasses ?? []) {
      const scheduled = new Date(assignment.scheduledDate);
      if (Number.isNaN(scheduled.getTime()) || toISODate(scheduled) !== target) continue;
      const ref = assignment.classId;
      const classId = typeof ref === 'string' ? ref : ref.id ?? ref._id ?? '';
      const minutes = scheduled.getHours() * 60 + scheduled.getMinutes();
      if (classId) entries.push({ classId, minutes: minutes === 0 ? null : minutes, link: { lessonId, title: lesson.title }, used: false });
    }
  }
  const result = new Map<string, LessonLink>();
  const take = (match: (e: (typeof entries)[number]) => boolean): LessonLink | null => {
    const entry = entries.find((e) => !e.used && match(e));
    if (!entry) return null;
    entry.used = true;
    return entry.link;
  };
  for (const period of periods) {
    const start = minutesOf(period.startTime);
    const end = minutesOf(period.endTime);
    const timed = take((e) => e.classId === period.classId && e.minutes !== null && e.minutes >= start && e.minutes < end);
    if (timed) { result.set(period.timetableId, timed); continue; }
    const firstOfClass = periods.find((p) => p.classId === period.classId)?.timetableId === period.timetableId;
    const untimed = firstOfClass ? take((e) => e.classId === period.classId && e.minutes === null) : null;
    if (untimed) result.set(period.timetableId, untimed);
  }
  return result;
}
