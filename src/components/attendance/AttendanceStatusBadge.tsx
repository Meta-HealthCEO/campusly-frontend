'use client';

import { Badge } from '@/components/ui/badge';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  absent: 'bg-destructive/10 text-destructive dark:bg-red-950 dark:text-destructive',
  late: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  excused: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
};

interface AttendanceStatusBadgeProps {
  status: string;
}

export function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  const style = STATUS_STYLES[status as AttendanceStatus] ?? '';
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <Badge variant="secondary" className={style}>
      {label}
    </Badge>
  );
}
