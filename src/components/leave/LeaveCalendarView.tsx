'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeaveCalendarEntry, LeaveType } from '@/types';

const TYPE_COLORS: Record<LeaveType, string> = {
  annual: 'bg-blue-200 dark:bg-blue-900/40',
  sick: 'bg-orange-200 dark:bg-orange-900/40',
  family_responsibility: 'bg-purple-200 dark:bg-purple-900/40',
  maternity: 'bg-pink-200 dark:bg-pink-900/40',
  paternity: 'bg-teal-200 dark:bg-teal-900/40',
  unpaid: 'bg-muted',
  study: 'bg-indigo-200 dark:bg-indigo-900/40',
};

interface LeaveCalendarViewProps {
  entries: LeaveCalendarEntry[];
  year: number;
  month: number;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function LeaveCalendarView({ entries, year, month }: LeaveCalendarViewProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dayEntries = useMemo(() => {
    const map = new Map<number, LeaveCalendarEntry[]>();
    for (const entry of entries) {
      const start = new Date(entry.startDate);
      const end = new Date(entry.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() === month) {
          const day = d.getDate();
          const existing = map.get(day) ?? [];
          existing.push(entry);
          map.set(day, existing);
        }
      }
    }
    return map;
  }, [entries, year, month]);

  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {monthName} {year}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px text-center text-xs">
          {weekdays.map((wd) => (
            <div key={wd} className="py-1 font-medium text-muted-foreground">
              {wd}
            </div>
          ))}

          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="py-1" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayLeave = dayEntries.get(day) ?? [];
            return (
              <div
                key={day}
                className="min-h-[48px] sm:min-h-[60px] border border-border rounded p-0.5 text-left"
              >
                <span className="text-xs font-medium">{day}</span>
                <div className="space-y-0.5 mt-0.5">
                  {dayLeave.slice(0, 2).map((entry, idx) => (
                    <div
                      key={`${entry.staffId}-${idx}`}
                      className={`rounded px-0.5 text-[10px] truncate ${TYPE_COLORS[entry.leaveType] ?? 'bg-muted'}`}
                      title={`${entry.staffName} - ${entry.leaveType}`}
                    >
                      {entry.staffName.split(' ')[0]}
                    </div>
                  ))}
                  {dayLeave.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{dayLeave.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
