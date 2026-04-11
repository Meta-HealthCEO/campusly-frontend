'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { TableSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeacherTimetable } from '@/hooks/useTeacherTimetable';
import type { TimetableSlot } from '@/types';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const dayLabels: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday',
};

/** Returns the lowercase day name (e.g. 'monday') for the given JS weekday. */
function currentDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

/** Parses an HH:MM (or HH:MM:SS) string into minutes since midnight. */
function parseTimeToMinutes(time?: string): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

const colorPalette = [
  'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300',
  'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300',
  'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300',
  'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300',
  'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300',
  'bg-cyan-100 border-cyan-300 text-cyan-800 dark:bg-cyan-950 dark:border-cyan-800 dark:text-cyan-300',
  'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300',
];

export default function TeacherTimetablePage() {
  const { timetable, loading } = useTeacherTimetable();

  // A ticking clock so the "current period" highlight stays accurate without
  // a manual refresh. One minute resolution is plenty for period boundaries.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const today = currentDayName(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const isCurrentSlot = (slot: TimetableSlot | undefined): boolean => {
    if (!slot || slot.day !== today) return false;
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime);
    if (start === null || end === null) return false;
    return nowMinutes >= start && nowMinutes < end;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Timetable" description="Your weekly teaching schedule" />
        <TableSkeleton rows={7} columns={6} />
      </div>
    );
  }

  if (timetable.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Timetable" description="Your weekly teaching schedule" />
        <EmptyState icon={Calendar} title="No timetable" description="No timetable entries have been assigned to you yet." />
      </div>
    );
  }

  // Build subject color map
  const subjectIds = [...new Set(timetable.map((s) => {
    if (typeof s.subjectId === 'string') return s.subjectId;
    return (s.subjectId as unknown as { _id?: string })?._id ?? '';
  }))];
  const subjectColors: Record<string, string> = {};
  subjectIds.forEach((id, i) => { subjectColors[id] = colorPalette[i % colorPalette.length]; });

  const periods = [...new Set(timetable.map((s) => s.period))].sort((a, b) => a - b);

  const getSlot = (day: string, period: number) =>
    timetable.find((s) => s.day === day && s.period === period);

  const getSubjectId = (slot: TimetableSlot): string =>
    typeof slot.subjectId === 'string'
      ? slot.subjectId
      : (slot.subjectId as unknown as { _id?: string })?._id ?? '';

  const getSubjectName = (slot: TimetableSlot): string => {
    if (slot.subject?.name) return slot.subject.name;
    if (typeof slot.subjectId === 'object' && slot.subjectId !== null) {
      return ((slot.subjectId as Record<string, unknown>).name as string) ?? 'Subject';
    }
    return 'Subject';
  };

  const getClassName = (slot: TimetableSlot): string => {
    if (typeof (slot as unknown as Record<string, unknown>).classId === 'object') {
      const cls = (slot as unknown as Record<string, unknown>).classId as Record<string, unknown>;
      return (cls.name as string) ?? '';
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Timetable" description="Your weekly teaching schedule" />

      {/* Desktop table */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground w-20">Period</th>
                  {days.map((day) => (
                    <th
                      key={day}
                      className={cn(
                        'p-3 text-left text-sm font-medium',
                        day === today
                          ? 'text-primary'
                          : 'text-muted-foreground',
                      )}
                    >
                      {dayLabels[day]}
                      {day === today && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase">
                          Today
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period} className="border-b last:border-0">
                    <td className="p-3">
                      <div className="text-sm font-medium">P{period}</div>
                      <div className="text-xs text-muted-foreground">
                        {getSlot(days[0], period)?.startTime ?? ''} - {getSlot(days[0], period)?.endTime ?? ''}
                      </div>
                    </td>
                    {days.map((day) => {
                      const slot = getSlot(day, period);
                      if (!slot) return (
                        <td key={day} className="p-2">
                          <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Free</div>
                        </td>
                      );
                      const current = isCurrentSlot(slot);
                      return (
                        <td key={day} className="p-2">
                          <div
                            className={cn(
                              'rounded-lg border p-3 space-y-0.5',
                              subjectColors[getSubjectId(slot)] || 'bg-muted',
                              current && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{getSubjectName(slot)}</p>
                              {current && (
                                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">
                                  Now
                                </span>
                              )}
                            </div>
                            {getClassName(slot) && <p className="text-xs opacity-80">{getClassName(slot)}</p>}
                            {slot.room && <p className="text-xs opacity-80">{slot.room}</p>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile list */}
      <div className="space-y-4 lg:hidden">
        {days.map((day) => {
          const daySlots = periods
            .map((p) => getSlot(day, p))
            .filter(Boolean) as TimetableSlot[];
          if (daySlots.length === 0) return null;
          const isToday = day === today;
          return (
            <Card
              key={day}
              className={isToday ? 'border-primary/60 ring-1 ring-primary/20' : ''}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {dayLabels[day]}
                  {isToday && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      Today
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {daySlots.map((slot) => {
                  const current = isCurrentSlot(slot);
                  return (
                    <div
                      key={`${day}-${slot.period}`}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3',
                        subjectColors[getSubjectId(slot)] || 'bg-muted',
                        current && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/50 text-xs font-bold dark:bg-black/20">
                        P{slot.period}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{getSubjectName(slot)}</p>
                          {current && (
                            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">
                              Now
                            </span>
                          )}
                        </div>
                        <p className="text-xs opacity-80 truncate">
                          {getClassName(slot) ? `${getClassName(slot)} - ` : ''}
                          {slot.room} &middot; {slot.startTime} - {slot.endTime}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
