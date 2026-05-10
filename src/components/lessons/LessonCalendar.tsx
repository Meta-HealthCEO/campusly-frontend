'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { Lesson, LessonAssignment, LessonAssignmentStatus } from '@/types/lesson';

interface Props {
  items: Lesson[];
}

/**
 * One calendar entry == one (lesson, assignment) pair. A lesson assigned to
 * 11A on Mon and 11B on Tue produces two entries; a library lesson (no
 * assignments) produces zero. The chip shows the class name first because
 * that's what disambiguates two cells of the same lesson on the calendar.
 */
interface CalendarEntry {
  key: string;
  lessonId: string;
  lessonTitle: string;
  className: string;
  status: LessonAssignmentStatus;
  isoKey: string;
}

interface DayCell {
  date: Date;
  inMonth: boolean;
  isoKey: string;
  entries: CalendarEntry[];
}

const STATUS_CHIP: Record<LessonAssignmentStatus, string> = {
  planned: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  taught: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
};

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Local-time ISO date (YYYY-MM-DD), avoids the toISOString UTC pitfall. */
function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns 0 (Mon) .. 6 (Sun). */
function mondayIndex(date: Date): number {
  const dow = date.getDay(); // Sun = 0
  return (dow + 6) % 7;
}

function buildMonthGrid(reference: Date): DayCell[] {
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

function readClassName(rel: LessonAssignment['classId']): string {
  return typeof rel === 'string' ? rel : (rel.name ?? '—');
}

function readClassId(rel: LessonAssignment['classId']): string {
  return typeof rel === 'string' ? rel : rel._id;
}

function expandLessonAssignments(items: Lesson[]): CalendarEntry[] {
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

export function LessonCalendar({ items }: Props) {
  const today = useMemo(() => new Date(), []);
  const monthLabel = today.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const todayIso = toLocalIsoDate(today);

  const cells = useMemo(() => {
    const grid = buildMonthGrid(today);
    const byDate = new Map<string, CalendarEntry[]>();
    for (const entry of expandLessonAssignments(items)) {
      const list = byDate.get(entry.isoKey) ?? [];
      list.push(entry);
      byDate.set(entry.isoKey, list);
    }
    return grid.map((cell) => ({
      ...cell,
      entries: byDate.get(cell.isoKey) ?? [],
    }));
  }, [items, today]);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">{monthLabel}</h3>
        <p className="text-xs text-muted-foreground">Current month</p>
      </div>

      <div className="grid grid-cols-7 border-b text-xs font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const visible = cell.entries.slice(0, 3);
          const overflow = cell.entries.length - visible.length;
          const isToday = cell.isoKey === todayIso;
          return (
            <div
              key={cell.isoKey}
              className={`min-h-24 border-b border-r p-1.5 ${
                cell.inMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground'
              }`}
            >
              <div
                className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  isToday ? 'bg-primary text-primary-foreground font-semibold' : ''
                }`}
              >
                {cell.date.getDate()}
              </div>
              <div className="space-y-0.5">
                {visible.map((entry) => (
                  <Link
                    key={entry.key}
                    href={`/teacher/lessons/${entry.lessonId}`}
                    className={`block truncate rounded border px-1.5 py-0.5 text-[10px] leading-tight hover:opacity-80 ${
                      STATUS_CHIP[entry.status]
                    }`}
                    title={`${entry.className} — ${entry.lessonTitle}`}
                  >
                    <span className="font-medium">{entry.className}</span>
                    {' · '}
                    {entry.lessonTitle}
                  </Link>
                ))}
                {overflow > 0 && (
                  <Link
                    href={`/teacher/lessons?dateFrom=${cell.isoKey}&dateTo=${cell.isoKey}`}
                    className="block text-[10px] text-muted-foreground hover:underline"
                  >
                    +{overflow} more
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
