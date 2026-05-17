'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AttendanceDayEditDialog } from '@/components/attendance/AttendanceDayEditDialog';
import { useAttendanceHistory, type HistoryStatus } from '@/hooks/useAttendanceHistory';
import { toISODate } from '@/lib/utils';
import { getStudentDisplayName } from '@/lib/student-helpers';
import type { Student } from '@/types';

type GridView = 'week' | 'month';

interface AttendanceHistoryTabProps {
  classId: string | null;
  period: number;
  students: Student[];
  onSetPeriod: (period: number) => void;
  onRefreshParent?: () => void;                     // if the parent wants to refresh after edit
  onRangeChange?: (dateFrom: string, dateTo: string) => void;  // so the page can scope PDF export to the visible grid
}

const STATUS_LETTER: Record<HistoryStatus, string> = {
  present: '✓', absent: 'A', late: 'L', excused: 'E',
};
const STATUS_COLOUR: Record<HistoryStatus, string> = {
  present: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30',
  absent: 'text-destructive bg-destructive/10',
  late: 'text-amber-700 bg-amber-50 dark:bg-amber-950/30',
  excused: 'text-blue-700 bg-blue-50 dark:bg-blue-950/30',
};

function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7; // 0 = Mon
}

function buildWeekRange(reference: Date): { dateFrom: string; dateTo: string; dates: string[] } {
  const monday = new Date(reference);
  monday.setDate(reference.getDate() - mondayIndex(reference));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4); // Mon-Fri by default
  const dates: string[] = [];
  for (let i = 0; i < 5; i += 1) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(toISODate(d));
  }
  return { dateFrom: dates[0]!, dateTo: dates[dates.length - 1]!, dates };
}

function buildMonthRange(reference: Date): { dateFrom: string; dateTo: string; dates: string[] } {
  const first = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const last = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  const dates: string[] = [];
  const cursor = new Date(first);
  while (cursor <= last) {
    // Mon-Fri only (skip weekends to keep the grid teacher-relevant)
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return { dateFrom: toISODate(first), dateTo: toISODate(last), dates };
}

export function AttendanceHistoryTab({ classId, period, students, onSetPeriod, onRefreshParent, onRangeChange }: AttendanceHistoryTabProps) {
  const [view, setView] = useState<GridView>('week');
  const [reference, setReference] = useState<Date>(new Date());
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const range = useMemo(
    () => (view === 'week' ? buildWeekRange(reference) : buildMonthRange(reference)),
    [view, reference],
  );

  const { records, loading, refresh } = useAttendanceHistory({
    classId,
    period,
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
  });

  // Notify the parent whenever the visible date range changes (so the PDF
  // export button can scope its download to exactly what's on screen).
  // Parent MUST provide a stable callback (useCallback) to avoid render loops.
  useEffect(() => {
    onRangeChange?.(range.dateFrom, range.dateTo);
  }, [range.dateFrom, range.dateTo, onRangeChange]);

  // index by studentId -> date -> status
  const byStudent = useMemo(() => {
    const map = new Map<string, Map<string, HistoryStatus>>();
    for (const r of records) {
      if (!map.has(r.studentId)) map.set(r.studentId, new Map());
      map.get(r.studentId)!.set(r.date, r.status);
    }
    return map;
  }, [records]);

  // Per-student %
  const studentPct = useMemo(() => {
    const out = new Map<string, number>();
    for (const s of students) {
      const dayMap = byStudent.get(s.id);
      if (!dayMap) { out.set(s.id, 0); continue; }
      const total = dayMap.size;
      const present = Array.from(dayMap.values()).filter((st) => st === 'present').length;
      out.set(s.id, total === 0 ? 0 : Math.round((present / total) * 100));
    }
    return out;
  }, [byStudent, students]);

  // Per-day %
  const dayPct = useMemo(() => {
    const out = new Map<string, number>();
    for (const d of range.dates) {
      let present = 0;
      let total = 0;
      for (const s of students) {
        const status = byStudent.get(s.id)?.get(d);
        if (status) {
          total += 1;
          if (status === 'present') present += 1;
        }
      }
      out.set(d, total === 0 ? 0 : Math.round((present / total) * 100));
    }
    return out;
  }, [byStudent, students, range.dates]);

  const stepBy = (deltaWeeks: number, deltaMonths: number) => {
    setReference((prev) => {
      const next = new Date(prev);
      if (deltaWeeks) next.setDate(next.getDate() + deltaWeeks * 7);
      if (deltaMonths) next.setMonth(next.getMonth() + deltaMonths);
      return next;
    });
  };

  const handlePrev = () => (view === 'week' ? stepBy(-1, 0) : stepBy(0, -1));
  const handleNext = () => (view === 'week' ? stepBy(1, 0) : stepBy(0, 1));
  const handleToday = () => setReference(new Date());

  const handleDayEdited = () => {
    void refresh();
    onRefreshParent?.();
  };

  if (!classId) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Select a class to view history.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Previous period" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next period" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>Today</Button>
          <Select value={String(period)} onValueChange={(v: unknown) => onSetPeriod(Number(v as string))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                <SelectItem key={p} value={String(p)}>Period {p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-2 text-sm text-muted-foreground">
            {range.dateFrom} → {range.dateTo}
          </span>
        </div>
        <div className="inline-flex overflow-hidden rounded-md border">
          <button
            type="button"
            onClick={() => setView('week')}
            className={`px-3 py-1 text-xs font-medium ${view === 'week' ? 'bg-muted' : 'hover:bg-muted/50'}`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setView('month')}
            className={`border-l px-3 py-1 text-xs font-medium ${view === 'month' ? 'bg-muted' : 'hover:bg-muted/50'}`}
          >
            Month
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Student</th>
              {range.dates.map((d) => (
                <th key={d} className="px-2 py-2 text-center font-medium">
                  {d.slice(5)}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <div className="text-sm font-medium">{getStudentDisplayName(s).full}</div>
                  {s.admissionNumber ? (
                    <div className="text-xs text-muted-foreground">{s.admissionNumber}</div>
                  ) : null}
                </td>
                {range.dates.map((d) => {
                  const status = byStudent.get(s.id)?.get(d);
                  return (
                    <td key={d} className="px-1 py-1 text-center">
                      <button
                        type="button"
                        aria-label={`Edit ${d}`}
                        onClick={() => setEditingDate(d)}
                        className={`inline-block w-7 rounded px-1 py-0.5 text-xs font-medium hover:ring-1 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring ${
                          status ? STATUS_COLOUR[status] : 'text-muted-foreground'
                        }`}
                      >
                        {status ? STATUS_LETTER[status] : '–'}
                      </button>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right text-sm font-medium">{studentPct.get(s.id) ?? 0}%</td>
              </tr>
            ))}
            {students.length === 0 ? (
              <tr><td colSpan={range.dates.length + 2} className="px-3 py-8 text-center text-muted-foreground">No students</td></tr>
            ) : null}
          </tbody>
          {students.length > 0 ? (
            <tfoot>
              <tr className="border-t bg-muted/30 text-xs">
                <td className="px-3 py-2 font-medium text-muted-foreground">Class %</td>
                {range.dates.map((d) => (
                  <td key={d} className="px-2 py-2 text-center font-medium">{dayPct.get(d) ?? 0}%</td>
                ))}
                <td className="px-3 py-2" />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {loading ? (
        <p className="text-center text-xs text-muted-foreground">Loading…</p>
      ) : null}

      {editingDate && classId ? (
        <AttendanceDayEditDialog
          open={editingDate !== null}
          onOpenChange={(open) => { if (!open) setEditingDate(null); }}
          classId={classId}
          date={editingDate}
          period={period}
          students={students}
          onSaved={handleDayEdited}
        />
      ) : null}
    </div>
  );
}
