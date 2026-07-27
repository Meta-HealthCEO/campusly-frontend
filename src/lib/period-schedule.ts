// ============================================================
// Period schedule helpers — pure time math + validation for the
// timetable period config. Extracted from PeriodConfigDialog for
// testability and file-size budget.
// ============================================================

import type { PeriodTime, BreakSlot } from '@/types/timetable-builder';

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function timeToMinutes(t: string): number {
  if (!TIME_RE.test(t)) return Number.NaN;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const normalized = Math.max(0, Math.min(mins, 23 * 60 + 59));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function generateDefaultTimes(count: number): PeriodTime[] {
  const times: PeriodTime[] = [];
  let cursor = 7 * 60 + 30;
  for (let i = 1; i <= count; i++) {
    const start = cursor;
    const end = start + 45;
    times.push({ period: i, startTime: minutesToTime(start), endTime: minutesToTime(end) });
    cursor = end + 5;
    if (i === 3) cursor += 25;
  }
  return times;
}

export function validateSchedule(periodTimes: PeriodTime[], breakSlots: BreakSlot[], periodCount: number): string | null {
  if (periodTimes.length !== periodCount) {
    return `Configure exactly ${periodCount} period time${periodCount === 1 ? '' : 's'}.`;
  }

  for (let i = 0; i < periodTimes.length; i++) {
    const pt = periodTimes[i];
    if (pt.period !== i + 1) {
      return 'Periods must run sequentially from P1.';
    }

    const start = timeToMinutes(pt.startTime);
    const end = timeToMinutes(pt.endTime);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return `P${pt.period} must use valid 24-hour times.`;
    }
    if (end <= start) {
      return `P${pt.period} must end after it starts.`;
    }

    const previous = periodTimes[i - 1];
    if (previous && start < timeToMinutes(previous.endTime)) {
      return `P${pt.period} overlaps P${previous.period}.`;
    }
  }

  const seenBreaks = new Set<number>();
  for (const brk of breakSlots) {
    if (!brk.label.trim()) return 'Each break needs a label.';
    if (!Number.isInteger(brk.duration) || brk.duration < 5 || brk.duration > 90) {
      return 'Break durations must be between 5 and 90 minutes.';
    }
    if (!Number.isInteger(brk.afterPeriod) || brk.afterPeriod < 1 || brk.afterPeriod >= periodCount) {
      return 'Breaks must be placed after a valid period and before the final period.';
    }
    if (seenBreaks.has(brk.afterPeriod)) {
      return `Only one break can be placed after P${brk.afterPeriod}.`;
    }
    seenBreaks.add(brk.afterPeriod);
  }

  return null;
}
