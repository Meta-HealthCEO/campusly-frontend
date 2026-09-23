import { toISODate } from './utils';

export interface MarkingDueSummary {
  dueToday: number;
  overdue: number;
}

/**
 * Counts marking work due today / overdue by the teacher's LOCAL calendar
 * day. The API sends full ISO timestamps (homework is stored as UTC midnight
 * of the picked day), so compare calendar days, never raw strings.
 */
export function summariseMarkingDue(
  items: ReadonlyArray<{ dueDate: string }>,
  now: Date = new Date(),
): MarkingDueSummary {
  const today = toISODate(now);
  return items.reduce<MarkingDueSummary>(
    (acc, item) => {
      const due = new Date(item.dueDate);
      if (!item.dueDate || Number.isNaN(due.getTime())) return acc;
      const dueDay = toISODate(due);
      if (dueDay === today) return { ...acc, dueToday: acc.dueToday + 1 };
      if (dueDay < today) return { ...acc, overdue: acc.overdue + 1 };
      return acc;
    },
    { dueToday: 0, overdue: 0 },
  );
}
