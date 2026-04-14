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

export const COLOR_PALETTE = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
];

export function getSubjectId(slot: TimetableSlot): string {
  const sid = slot.subjectId;
  if (typeof sid === 'string') return sid;
  if (sid && typeof sid === 'object' && 'id' in sid) return String((sid as { id: string }).id);
  return '';
}

export function getSubjectName(slot: TimetableSlot): string {
  if (slot.subject && typeof slot.subject === 'object' && 'name' in slot.subject) {
    return slot.subject.name;
  }
  return 'Subject';
}

export function getClassName(slot: TimetableSlot): string {
  const cid = slot.classId;
  if (cid && typeof cid === 'object' && 'name' in cid) {
    return (cid as { name: string }).name;
  }
  return '';
}

export function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
