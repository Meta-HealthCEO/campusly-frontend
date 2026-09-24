import type { BreakSlot, PeriodTime, PeriodsPerDay, TimetableConfig } from '@/types';

export interface PeriodConfigForm {
  periodsPerDay: PeriodsPerDay;
  periodTimes: PeriodTime[];
  breakSlots: BreakSlot[];
  academicYear: number;
  term: number;
}

const DEFAULT_PERIODS_PER_DAY: PeriodsPerDay = { monday: 7, tuesday: 7, wednesday: 7, thursday: 7, friday: 7 };

/**
 * The period step's form values. A saved config may leave out the year and
 * term (both optional on the API), so every field gets a value and no input
 * flips from controlled to uncontrolled.
 */
export function periodConfigForm(config: TimetableConfig | null, currentYear: number): PeriodConfigForm {
  return {
    periodsPerDay: config?.periodsPerDay ?? DEFAULT_PERIODS_PER_DAY,
    periodTimes: config?.periodTimes ?? [],
    breakSlots: config?.breakSlots ?? [],
    academicYear: config?.academicYear ?? currentYear,
    term: config?.term ?? 1,
  };
}
