const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Exams are South African: days are counted on the Johannesburg calendar, whatever zone the device runs in. */
export const EXAM_TIME_ZONE = 'Africa/Johannesburg';

const SA_DATE = new Intl.DateTimeFormat('en-ZA', { timeZone: EXAM_TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric' });

/** The Johannesburg calendar day of an instant, as a UTC midnight timestamp (so offsets never shift the count). */
function saDayStamp(d: Date): number {
  const parts = SA_DATE.formatToParts(d);
  const part = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((p: Intl.DateTimeFormatPart) => p.type === type)?.value);
  return Date.UTC(part('year'), part('month') - 1, part('day'));
}

/** Whole Johannesburg calendar days from `now` to `exam`; negative once the exam has passed. */
export function daysUntil(exam: Date, now: Date): number {
  return Math.round((saDayStamp(exam) - saDayStamp(now)) / DAY_MS);
}

/** "Tue 27 Oct": the exam's Johannesburg date, without the locale. */
export function formatExamDate(d: Date): string {
  const day = new Date(saDayStamp(d));
  return `${WEEKDAYS[day.getUTCDay()]} ${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]}`;
}

/** Spec §1: "32 days to Paper 1 · Tue 27 Oct". */
export function countdownText(paper: string, exam: Date, now: Date): string {
  const days = daysUntil(exam, now);
  const date = formatExamDate(exam);
  if (days > 1) return `${days} days to ${paper} · ${date}`;
  if (days === 1) return `1 day to ${paper} · ${date}`;
  if (days === 0) return `${paper} is today · ${date}`;
  return `${paper} was on ${date}`;
}
