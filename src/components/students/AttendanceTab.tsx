'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { CalendarCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Attendance } from '@/types';

const statusStyles: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  absent: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
  late: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  excused: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

interface AttendanceTabProps {
  attendance: Attendance[];
}

export function AttendanceTab({ attendance }: AttendanceTabProps) {
  if (attendance.length === 0) {
    return <EmptyState icon={CalendarCheck} title="No attendance records" description="Attendance data will appear here." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Records</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {attendance.slice(0, 20).map((att) => (
            <div key={att.id} className="flex items-center justify-between rounded-lg border p-2 px-3">
              <span className="text-sm">{formatDate(att.date)}</span>
              <Badge className={statusStyles[att.status] || ''}>
                {att.status.charAt(0).toUpperCase() + att.status.slice(1)}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
