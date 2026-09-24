import type { TimetableSlot, DayOfWeek } from '@/types';

export const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

export const DAY_LABELS_SHORT: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
};

/** Subject identity colours, from the teacher chart palette (a tint, a matching edge, body text on top). */
export const COLOR_PALETTE = [
  'border bg-chart-1/15 border-chart-1/40 text-foreground',
  'border bg-chart-3/15 border-chart-3/40 text-foreground',
  'border bg-chart-5/15 border-chart-5/40 text-foreground',
  'border bg-chart-4/15 border-chart-4/40 text-foreground',
  'border bg-chart-2/20 border-chart-2/50 text-foreground',
];

export function getSubjectId(slot: TimetableSlot): string {
  return resolveId(slot.subjectId) || resolveId((slot as unknown as { subject?: unknown }).subject);
}

export function getSubjectName(slot: TimetableSlot): string {
  const populatedSubject =
    (slot as unknown as { subject?: unknown }).subject ??
    (slot as unknown as { subjectId?: unknown }).subjectId;

  if (populatedSubject && typeof populatedSubject === 'object' && 'name' in populatedSubject) {
    return String((populatedSubject as { name?: string }).name || 'Subject');
  }
  return 'Subject';
}

export function getClassName(slot: TimetableSlot): string {
  const populatedClass =
    (slot as unknown as { class?: unknown }).class ??
    (slot as unknown as { classId?: unknown }).classId;

  if (populatedClass && typeof populatedClass === 'object' && 'name' in populatedClass) {
    return String((populatedClass as { name?: string }).name || '');
  }
  return '';
}

/** Extract ID from a field that may be a populated object or a plain string. */
export function resolveId(field: unknown): string {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object' && 'id' in field) return String((field as { id: string }).id);
  if (field && typeof field === 'object' && '_id' in field) return String((field as { _id: string })._id);
  return '';
}

export function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.NaN;
  return h * 60 + m;
}
