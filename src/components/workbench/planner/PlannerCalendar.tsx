'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AssessmentBlock } from './AssessmentBlock';
import type { PlannedAssessment, DateClash } from '@/types';

interface Props {
  assessments: PlannedAssessment[];
  clashes: DateClash[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDateClick: (date: string) => void;
  onAssessmentClick: (assessment: PlannedAssessment) => void;
}

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday = 0
  const days: Date[] = [];
  // pad start
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }
  const last = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= last; d++) {
    days.push(new Date(year, month, d));
  }
  // pad end to complete row
  while (days.length % 7 !== 0) {
    days.push(new Date(year, month + 1, days.length - last - startDay + 1));
  }
  return days;
}

export function PlannerCalendar({
  assessments,
  clashes,
  currentMonth,
  onMonthChange,
  onDateClick,
  onAssessmentClick,
}: Props) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const assessmentsByDate = useMemo(() => {
    const map = new Map<string, PlannedAssessment[]>();
    for (const a of assessments) {
      const key = a.plannedDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [assessments]);

  const clashDates = useMemo(
    () => new Set(clashes.map((c) => c.date.slice(0, 10))),
    [clashes],
  );

  const todayStr = toISODate(new Date());

  function prevMonth() {
    onMonthChange(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    onMonthChange(new Date(year, month + 1, 1));
  }

  const monthLabel = currentMonth.toLocaleDateString('en-ZA', {
    month: 'long',
    year: 'numeric',
  });

  // Sort assessments for list view
  const sortedAssessments = useMemo(
    () => [...assessments].sort((a, b) => a.plannedDate.localeCompare(b.plannedDate)),
    [assessments],
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-sm sm:text-base">{monthLabel}</h3>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Desktop grid */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden">
          {DOW_LABELS.map((d) => (
            <div
              key={d}
              className="bg-muted text-center text-xs font-medium py-2 text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border border rounded-b-lg overflow-hidden">
          {days.map((day, idx) => {
            const dateStr = toISODate(day);
            const inMonth = day.getMonth() === month;
            const dayAssessments = assessmentsByDate.get(dateStr) ?? [];
            const isClash = clashDates.has(dateStr);
            const isToday = dateStr === todayStr;

            return (
              <div
                key={idx}
                className={cn(
                  'bg-background min-h-[80px] p-1 cursor-pointer hover:bg-muted/50 transition-colors',
                  !inMonth && 'opacity-40',
                  isClash && 'ring-2 ring-inset ring-destructive',
                  isToday && 'bg-primary/5',
                )}
                onClick={() => onDateClick(dateStr)}
              >
                <span
                  className={cn(
                    'text-xs font-medium',
                    isToday && 'text-primary font-bold',
                    !inMonth && 'text-muted-foreground',
                  )}
                >
                  {day.getDate()}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayAssessments.slice(0, 3).map((a, i) => (
                    <AssessmentBlock
                      key={i}
                      assessment={a}
                      onClick={() => onAssessmentClick(a)}
                    />
                  ))}
                  {dayAssessments.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{dayAssessments.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile list */}
      <div className="sm:hidden space-y-2">
        {sortedAssessments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No assessments planned this month.
          </p>
        ) : (
          sortedAssessments.map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:bg-muted/50"
              onClick={() => onAssessmentClick(a)}
            >
              <div className="text-xs text-muted-foreground min-w-[56px]">
                {new Date(a.plannedDate).toLocaleDateString('en-ZA', {
                  day: 'numeric',
                  month: 'short',
                })}
              </div>
              <AssessmentBlock assessment={a} onClick={() => onAssessmentClick(a)} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
