'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { Lesson, LessonStatus } from '@/types/lesson';

interface Props {
  items: Lesson[];
}

interface DayCell {
  date: Date;
  inMonth: boolean;
  isoKey: string;
  lessons: Lesson[];
}

const STATUS_CHIP: Record<LessonStatus, string> = {
  draft: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  ready: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
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
      lessons: [],
    });
  }
  return cells;
}

function lessonIsoDate(lesson: Lesson): string {
  if (!lesson.date) return '';
  const d = new Date(lesson.date);
  if (Number.isNaN(d.getTime())) return '';
  return toLocalIsoDate(d);
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
    const byDate = new Map<string, Lesson[]>();
    for (const lesson of items) {
      const key = lessonIsoDate(lesson);
      if (!key) continue;
      const list = byDate.get(key) ?? [];
      list.push(lesson);
      byDate.set(key, list);
    }
    return grid.map((cell) => ({
      ...cell,
      lessons: byDate.get(cell.isoKey) ?? [],
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
          const visible = cell.lessons.slice(0, 3);
          const overflow = cell.lessons.length - visible.length;
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
                {visible.map((lesson) => (
                  <Link
                    key={lesson._id}
                    href={`/teacher/lessons/${lesson._id}`}
                    className={`block truncate rounded border px-1.5 py-0.5 text-[10px] leading-tight hover:opacity-80 ${
                      STATUS_CHIP[lesson.status]
                    }`}
                    title={lesson.title}
                  >
                    {lesson.title}
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
