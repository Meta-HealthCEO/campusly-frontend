import type { NavSection } from '@/lib/constants';
import type { AnnotatedPeriod } from '@/lib/teacher-today';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/** The mono eyebrow above a page title, e.g. "THU 24 SEP". */
export function todayEyebrow(now: Date): string {
  return `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`;
}

const count = (n: number): string => `${WORDS[n] ?? n} period${n === 1 ? '' : 's'} today`;

/** The line under the greeting: how many periods, and what is on now or next. */
export function todayLede(periods: AnnotatedPeriod[]): string | null {
  if (periods.length === 0) return null;
  const current = periods.find((p: AnnotatedPeriod) => p.phase === 'now');
  if (current) return `${count(periods.length)}. On now: ${current.subjectName} with ${current.className}.`;
  const next = periods.find((p: AnnotatedPeriod) => p.phase === 'next');
  if (next) return `${count(periods.length)}. Next up: ${next.subjectName} with ${next.className} at ${next.startTime}.`;
  return `${count(periods.length)}, all done.`;
}

/** A page's nav section as an eyebrow, e.g. "ASSESS". */
export function sectionEyebrow(section: NavSection): string {
  return section.toUpperCase();
}

/** The week a date falls in, named by its Monday: "WEEK OF 21 SEP". */
export function weekOfEyebrow(date: Date): string {
  const back = (date.getDay() + 6) % 7;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - back);
  return `WEEK OF ${monday.getDate()} ${MONTHS[monday.getMonth()]}`;
}

/** The known parts of a page's context, e.g. "GRADE 1 - A · PERIOD 1"; the fallback when none are known. */
export function contextEyebrow(parts: ReadonlyArray<string | null | undefined>, fallback = ''): string {
  const known = parts.filter((part): part is string => Boolean(part && part.trim()));
  return (known.length > 0 ? known.join(' · ') : fallback).toUpperCase();
}
