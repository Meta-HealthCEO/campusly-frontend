'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Attendance } from '@/types';

interface AttendanceCalendarProps {
  records: Attendance[];
  childName: string;
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_CELL_STYLES: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-200 text-emerald-900 border-emerald-300',
  absent: 'bg-red-200 text-destructive border-red-300',
  late: 'bg-amber-200 text-amber-900 border-amber-300',
  excused: 'bg-blue-200 text-blue-900 border-blue-300',
};

const STATUS_LEGEND: { status: AttendanceStatus; code: string; label: string; color: string }[] = [
  { status: 'present', code: 'P', label: 'Present', color: 'bg-emerald-200 text-emerald-900' },
  { status: 'absent', code: 'A', label: 'Absent', color: 'bg-red-200 text-destructive' },
  { status: 'late', code: 'L', label: 'Late', color: 'bg-amber-200 text-amber-900' },
  { status: 'excused', code: 'E', label: 'Excused', color: 'bg-blue-200 text-blue-900' },
];

const STATUS_CODES: Record<AttendanceStatus, string> = {
  present: 'P',
  absent: 'A',
  late: 'L',
  excused: 'E',
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isWeekend(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function buildRecordMap(records: Attendance[]): Map<string, AttendanceStatus> {
  const map = new Map<string, AttendanceStatus>();
  for (const record of records) {
    const d = new Date(record.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    map.set(key, record.status);
  }
  return map;
}

export function AttendanceCalendar({ records, childName }: AttendanceCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const recordMap = useMemo(() => buildRecordMap(records), [records]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const goToPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const cells: React.ReactNode[] = [];

  // Empty cells before the first day
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="h-10" />);
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = (firstDay + day - 1) % 7;
    const weekend = isWeekend(dayOfWeek);
    const key = `${year}-${month}-${day}`;
    const status = recordMap.get(key);

    let cellClass = 'h-10 w-full rounded-md border text-xs font-medium flex items-center justify-center transition-colors';

    if (status) {
      cellClass += ` ${STATUS_CELL_STYLES[status]}`;
    } else if (weekend) {
      cellClass += ' bg-muted/50 text-muted-foreground border-muted';
    } else {
      cellClass += ' bg-background text-muted-foreground border-border';
    }

    cells.push(
      <div key={key} className={cellClass} title={status ? `${day} - ${status}` : `${day}`}>
        <span className="flex flex-col items-center leading-tight">
          <span className="text-[10px] opacity-70">{day}</span>
          {status && <span className="text-[10px] font-bold">{STATUS_CODES[status]}</span>}
        </span>
      </div>,
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Monthly Attendance Calendar</CardTitle>
            <CardDescription>Attendance heatmap for {childName}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevMonth} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {formatMonthYear(year, month)}
            </span>
            <Button variant="outline" size="icon" onClick={goToNextMonth} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_LABELS.map((label) => (
            <div
              key={label}
              className="h-8 flex items-center justify-center text-xs font-semibold text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t">
          {STATUS_LEGEND.map(({ code, label, color }) => (
            <div key={code} className="flex items-center gap-1.5">
              <div className={`h-5 w-5 rounded text-[10px] font-bold flex items-center justify-center ${color}`}>
                {code}
              </div>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded bg-muted/50 border border-muted" />
            <span className="text-xs text-muted-foreground">Weekend</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
