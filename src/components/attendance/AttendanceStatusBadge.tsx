'use client';

import { Badge } from '@/components/ui/badge';
import { attendanceBadgeClass } from '@/lib/attendance-badge';

interface AttendanceStatusBadgeProps {
  status: string;
}

export function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge variant="secondary" className={attendanceBadgeClass(status)}>
      {label}
    </Badge>
  );
}
