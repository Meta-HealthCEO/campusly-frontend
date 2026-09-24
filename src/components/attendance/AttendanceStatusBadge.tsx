'use client';

import { Badge } from '@/components/ui/badge';
import { StatusChip } from '@/components/shared/StatusChip';

const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const;
type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

const isAttendanceStatus = (status: string): status is AttendanceStatus =>
  (ATTENDANCE_STATUSES as readonly string[]).includes(status);

interface AttendanceStatusBadgeProps {
  status: string;
}

export function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  if (isAttendanceStatus(status)) return <StatusChip status={status} />;
  return <Badge variant="secondary">{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}
