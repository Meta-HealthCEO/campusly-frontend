const BADGE: Record<string, string> = {
  present: 'bg-success-soft text-success',
  absent: 'bg-destructive-soft text-destructive',
  late: 'bg-attention-soft text-attention',
  excused: 'bg-info-soft text-info',
};

/** Badge colours for an attendance status (shared with /admin/attendance); an unknown status stays plain. */
export function attendanceBadgeClass(status: string): string {
  return BADGE[status] ?? '';
}
