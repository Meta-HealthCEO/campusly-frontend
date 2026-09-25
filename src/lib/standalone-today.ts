/** Today for a standalone teacher's learner (spec §2): one next step, then what's due. */

export interface TodayItem { title: string; detail: string; href: string }
export interface TodayNextUp { eyebrow: string; title: string; detail?: string; actionLabel: string; href: string }

const SAST_OFFSET_MS = 2 * 3600_000;
const DAY_MS = 24 * 3600_000;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Due today", "Due tomorrow", "Due Sat 3 Oct" or "Overdue", by the South African calendar day. */
export function dueText(iso: string, now: Date): string {
  const due = new Date(new Date(iso).getTime() + SAST_OFFSET_MS);
  const days = Math.floor(due.getTime() / DAY_MS) - Math.floor((now.getTime() + SAST_OFFSET_MS) / DAY_MS);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due ${DAYS[due.getUTCDay()]} ${due.getUTCDate()} ${MONTHS[due.getUTCMonth()]}`;
}

/** The one thing to do next: the lesson under way, else homework, else a test. */
export function todayNextUp(input: {
  unit: { title: string; href: string; progressPercent: number } | null;
  homework: TodayItem | null;
  test: TodayItem | null;
}): TodayNextUp | null {
  if (input.unit) {
    return { eyebrow: 'Continue your lesson', title: input.unit.title, detail: `${input.unit.progressPercent}% done`, actionLabel: 'Continue', href: input.unit.href };
  }
  if (input.homework) return { eyebrow: 'Next homework', title: input.homework.title, detail: input.homework.detail, actionLabel: 'Open homework', href: input.homework.href };
  if (input.test) return { eyebrow: 'Next test', title: input.test.title, detail: input.test.detail, actionLabel: 'Open test', href: input.test.href };
  return null;
}
