'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { FullStudent360Attendance } from '@/types/student-360';

interface AttendanceSummaryCardProps {
  attendance: FullStudent360Attendance;
}

interface SegmentData {
  label: string;
  value: number;
  color: string;
  ringColor: string;
}

export function AttendanceSummaryCard({ attendance }: AttendanceSummaryCardProps) {
  const total = attendance.present + attendance.absent + attendance.late + attendance.excused;

  const segments: SegmentData[] = useMemo(
    () => [
      { label: 'Present', value: attendance.present, color: 'bg-emerald-500', ringColor: '#10b981' },
      { label: 'Late', value: attendance.late, color: 'bg-yellow-500', ringColor: '#eab308' },
      { label: 'Excused', value: attendance.excused, color: 'bg-blue-500', ringColor: '#3b82f6' },
      { label: 'Absent', value: attendance.absent, color: 'bg-destructive', ringColor: 'hsl(var(--destructive))' },
    ],
    [attendance],
  );

  // SVG ring chart
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  const ringSegments = useMemo(() => {
    if (total === 0) return [];
    let offset = 0;
    return segments
      .filter((s) => s.value > 0)
      .map((s) => {
        const pct = s.value / total;
        const dash = pct * circumference;
        const segment = { ...s, dash, offset };
        offset += dash;
        return segment;
      });
  }, [segments, total, circumference]);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No attendance records for this year.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Attendance</CardTitle>
          <Badge
            variant="secondary"
            className={
              attendance.percentage >= 90
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                : attendance.percentage >= 75
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-destructive/10 text-destructive'
            }
          >
            {attendance.percentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Ring chart */}
          <div className="relative shrink-0">
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
              {ringSegments.map((seg) => (
                <circle
                  key={seg.label}
                  cx="65"
                  cy="65"
                  r={radius}
                  fill="none"
                  stroke={seg.ringColor}
                  strokeWidth="12"
                  strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
                  strokeDashoffset={-seg.offset}
                  transform="rotate(-90 65 65)"
                  className="transition-all"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold">{total}</span>
              <span className="text-[10px] text-muted-foreground">days</span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {segments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${seg.color} shrink-0`} />
                <span className="text-muted-foreground">{seg.label}</span>
                <span className="font-medium ml-auto">{seg.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
