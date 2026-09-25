import { toISODate } from '@/lib/utils';

/** The register's period picker: lesson 1–8. A standalone teacher has no timetable, so they pick the lesson number. */
export const REGISTER_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
/** School timetables run to 12 periods; a link (e.g. from Your day) may name any of them. */
export const MAX_REGISTER_PERIOD = 12;

/** The picker's options: lessons 1–8, plus the current period when it is later (from a timetable link). */
export function registerPeriodOptions(current: number): number[] {
  const base: number[] = [...REGISTER_PERIODS];
  return base.includes(current) ? base : [...base, current];
}

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
  const period = Number.isInteger(wantedPeriod) && wantedPeriod >= 1 && wantedPeriod <= MAX_REGISTER_PERIOD ? wantedPeriod : 1;

  return { classId, date, period };
}
