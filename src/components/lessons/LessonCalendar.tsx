'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Lesson } from '@/types/lesson';
import {
  buildMonthGrid,
  buildWeekGrid,
  expandLessonAssignments,
  formatPeriodLabel,
  MONTH_OPTIONS,
  STATUS_CHIP,
  toLocalIsoDate,
  WEEKDAY_LABELS,
  type CalendarView,
} from './lesson-calendar.utils';

interface Props {
  items: Lesson[];
}

export function LessonCalendar({ items }: Props) {
  const today = useMemo(() => new Date(), []);
  const todayIso = toLocalIsoDate(today);

  const [view, setView] = useState<CalendarView>('month');
  const [reference, setReference] = useState<Date>(today);

  const yearOptions = useMemo(() => {
    const cur = new Date().getFullYear();
    const out: number[] = [];
    for (let y = cur + 1; y >= cur - 2; y -= 1) out.push(y);
    return out;
  }, []);

  const cells = useMemo(() => {
    const grid = view === 'month' ? buildMonthGrid(reference) : buildWeekGrid(reference);
    const byDate = new Map<string, ReturnType<typeof expandLessonAssignments>>();
    for (const entry of expandLessonAssignments(items)) {
      const list = byDate.get(entry.isoKey) ?? [];
      list.push(entry);
      byDate.set(entry.isoKey, list);
    }
    return grid.map((cell) => ({
      ...cell,
      entries: byDate.get(cell.isoKey) ?? [],
    }));
  }, [items, reference, view]);

  const periodLabel = formatPeriodLabel(reference, view);

  const stepBy = (deltaMonths: number, deltaDays: number) => {
    setReference((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate());
      if (deltaMonths) next.setMonth(next.getMonth() + deltaMonths);
      if (deltaDays) next.setDate(next.getDate() + deltaDays);
      return next;
    });
  };

  const handlePrev = () => (view === 'month' ? stepBy(-1, 0) : stepBy(0, -7));
  const handleNext = () => (view === 'month' ? stepBy(1, 0) : stepBy(0, 7));
  const handleToday = () => setReference(new Date());

  const handleMonthSelect = (v: string) => {
    setReference((prev) => new Date(prev.getFullYear(), Number(v), 1));
  };
  const handleYearSelect = (v: string) => {
    setReference((prev) => new Date(Number(v), prev.getMonth(), 1));
  };

  // Week view cells are taller so they can hold more entries; the column
  // header already shows the date so we suppress the in-cell date marker.
  const cellHeightClass = view === 'week' ? 'min-h-64' : 'min-h-24';
  const visibleEntriesPerCell = view === 'week' ? 8 : 3;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{periodLabel}</h3>
          <Button variant="ghost" size="icon-sm" aria-label="Previous period" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next period" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(reference.getMonth())}
            onValueChange={(v: unknown) =>
              handleMonthSelect(typeof v === 'string' ? v : '0')
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(reference.getFullYear())}
            onValueChange={(v: unknown) =>
              handleYearSelect(typeof v === 'string' ? v : String(new Date().getFullYear()))
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="inline-flex overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setView('month')}
              className={`px-3 py-1 text-xs font-medium ${view === 'month' ? 'bg-muted' : 'hover:bg-muted/50'}`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setView('week')}
              className={`border-l px-3 py-1 text-xs font-medium ${view === 'week' ? 'bg-muted' : 'hover:bg-muted/50'}`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b text-xs font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((label, i) => {
          const headerDate = view === 'week' ? cells[i]?.date : null;
          const isHeaderToday =
            headerDate ? toLocalIsoDate(headerDate) === todayIso : false;
          return (
            <div key={label} className="px-2 py-2 text-center">
              <span>{label}</span>
              {headerDate ? (
                <span
                  className={`ml-1 ${isHeaderToday ? 'font-semibold text-primary' : 'text-foreground'}`}
                >
                  {headerDate.getDate()}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const visible = cell.entries.slice(0, visibleEntriesPerCell);
          const overflow = cell.entries.length - visible.length;
          const isToday = cell.isoKey === todayIso;
          return (
            <div
              key={cell.isoKey}
              className={`${cellHeightClass} border-b border-r p-1.5 ${
                cell.inMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground'
              }`}
            >
              {view === 'month' ? (
                <div
                  className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    isToday ? 'bg-primary font-semibold text-primary-foreground' : ''
                  }`}
                >
                  {cell.date.getDate()}
                </div>
              ) : null}
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
