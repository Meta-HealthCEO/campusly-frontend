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
