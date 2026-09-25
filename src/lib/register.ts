import { toISODate } from '@/lib/utils';

/** The register's period picker: lesson 1–8. A standalone teacher has no timetable, so they pick the lesson number. */
export const REGISTER_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export interface RegisterDefaults {
  classId: string | null;
  /** YYYY-MM-DD in the teacher's own timezone. */
  date: string;
  period: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What the register opens on: the class, date and period in the link when
 * they're valid, otherwise the teacher's first class, today and period 1.
 */
export function defaultRegister(classes: Array<{ id: string }>, search: URLSearchParams, today: Date): RegisterDefaults {
  const wantedClass = search.get('classId');
  const classId = wantedClass && classes.some((c) => c.id === wantedClass) ? wantedClass : (classes[0]?.id ?? null);

  const todayISO = toISODate(today);
  const wantedDate = search.get('date') ?? '';
  const date = ISO_DATE.test(wantedDate) && wantedDate <= todayISO ? wantedDate : todayISO;

  const wantedPeriod = Number(search.get('period'));
  const period = (REGISTER_PERIODS as readonly number[]).includes(wantedPeriod) ? wantedPeriod : 1;

  return { classId, date, period };
}
