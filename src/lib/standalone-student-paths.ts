/**
 * A standalone teacher's learner sees a focused slice of the learner portal
 * (spec §2). The dashboard layout sends them to Today from anything else, so
 * every link in STANDALONE_STUDENT_NAV — and every in-page link those pages
 * render — must resolve to one of these pages or their sub-pages.
 */
export const STANDALONE_STUDENT_PAGES = [
  '/student',
  '/student/courses',
  '/student/homework',
  // A project opens here from Homework; the list page (/student/assignments) is hidden.
  '/student/assignments/[id]',
  '/student/tests',
  '/student/grades',
  '/student/ai-tutor',
  '/student/profile',
  '/notifications',
] as const;

const PATTERNS: readonly RegExp[] = STANDALONE_STUDENT_PAGES.map((page: string) =>
  page === '/student' ? /^\/student$/ : new RegExp(`^${page.replace(/\[[^\]]+\]/g, '[^/]+')}(?:/.*)?$`));

export function isStandaloneStudentPathAllowed(pathname: string): boolean {
  return PATTERNS.some((re: RegExp) => re.test(pathname));
}
