const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The local calendar day as a UTC timestamp, so daylight saving and UTC offsets never shift the count. */
const dayStamp = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

/** Whole calendar days from `now` to `exam` in the user's own time zone; negative once the exam has passed. */
export function daysUntil(exam: Date, now: Date): number {
  return Math.round((dayStamp(exam) - dayStamp(now)) / DAY_MS);
}

export function formatExamDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
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
