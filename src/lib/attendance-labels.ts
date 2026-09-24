import type { AttendanceStatus } from '@/hooks/useTeacherAttendance';

const LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
};

/** The word on a register button. Phones show it too, under the icon, so a status is never an icon alone. */
export function statusButtonLabel(status: AttendanceStatus): string {
  return LABELS[status];
}
