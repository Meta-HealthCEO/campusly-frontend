import type { Lesson, LessonAssignment, LessonAssignmentStatus } from '@/types/lesson';

/**
 * One calendar entry == one (lesson, assignment) pair. A lesson assigned to
 * 11A on Mon and 11B on Tue produces two entries; a library lesson (no
 * assignments) produces zero. The chip shows the class name first because
 * that's what disambiguates two cells of the same lesson on the calendar.
 */
export interface CalendarEntry {
  key: string;
  lessonId: string;
  lessonTitle: string;
  className: string;
  status: LessonAssignmentStatus;
  isoKey: string;
}

export interface DayCell {
  date: Date;
  inMonth: boolean;
  isoKey: string;
  entries: CalendarEntry[];
}

export type CalendarView = 'month' | 'week';

export const STATUS_CHIP: Record<LessonAssignmentStatus, string> = {
  planned: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  taught: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
};

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
];

/** Local-time ISO date (YYYY-MM-DD), avoids the toISOString UTC pitfall. */
export function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns 0 (Mon) .. 6 (Sun). */
export function mondayIndex(date: Date): number {
  const dow = date.getDay(); // Sun = 0
  return (dow + 6) % 7;
}

export function buildMonthGrid(reference: Date): DayCell[] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const start = new Date(year, month, 1 - mondayIndex(firstOfMonth));
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      date: d,
      inMonth: d.getMonth() === month,
      isoKey: toLocalIsoDate(d),
      entries: [],
    });
  }
  return cells;
}

export function buildWeekGrid(reference: Date): DayCell[] {
  const monday = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate() - mondayIndex(reference),
  );
  const cells: DayCell[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    cells.push({
      date: d,
      inMonth: true, // every day in a week view is "in view"
      isoKey: toLocalIsoDate(d),
      entries: [],
    });
  }
  return cells;
}

function readClassName(rel: LessonAssignment['classId']): string {
  return typeof rel === 'string' ? rel : (rel.name ?? '—');
}

function readClassId(rel: LessonAssignment['classId']): string {
  return typeof rel === 'string' ? rel : rel._id;
}

export function expandLessonAssignments(items: Lesson[]): CalendarEntry[] {
  const out: CalendarEntry[] = [];
  for (const lesson of items) {
    for (const a of lesson.assignedClasses ?? []) {
      const d = new Date(a.scheduledDate);
      if (Number.isNaN(d.getTime())) continue;
      out.push({
        key: `${lesson._id}:${readClassId(a.classId)}`,
        lessonId: lesson._id,
        lessonTitle: lesson.title,
        className: readClassName(a.classId),
        status: a.status,
        isoKey: toLocalIsoDate(d),
      });
    }
  }
  return out;
}

export function formatPeriodLabel(reference: Date, view: CalendarView): string {
  if (view === 'month') {
    return reference.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  const monday = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate() - mondayIndex(reference),
  );
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}–${sunday.getDate()} ${monday.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
  }
  if (monday.getFullYear() === sunday.getFullYear()) {
    return `${monday.getDate()} ${monday.toLocaleDateString(undefined, { month: 'short' })} – ${sunday.getDate()} ${sunday.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
  }
  return `${monday.getDate()} ${monday.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })} – ${sunday.getDate()} ${sunday.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
}
