/**
 * Independent (standalone) teachers get a focused slice of the teacher
 * portal. The dashboard layout bounces them to /teacher from anything else,
 * so every link in STANDALONE_TEACHER_NAV — and every in-page link those
 * pages render — must resolve to one of these prefixes.
 */
export const STANDALONE_TEACHER_PREFIXES = [
  '/teacher/onboarding',
  '/teacher/classes',
  '/teacher/students',
  '/teacher/attendance',
  // "Lessons": the AI class units.
  '/teacher/courses',
  '/teacher/curriculum/textbooks',
  '/teacher/curriculum/mark-papers',
  '/teacher/workbench/marking-hub',
  '/teacher/papers',
  '/teacher/grades',
  '/teacher/homework',
  // Project pages (a Homework "Project" opens the assignment flow).
  '/teacher/assignments',
  '/teacher/settings',
  '/my/billing',
  '/subscription',
  '/verify-email',
] as const;

export function isStandaloneTeacherPathAllowed(pathname: string): boolean {
  if (pathname === '/teacher') return true;
  return STANDALONE_TEACHER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Whether a link on a shared page may be shown: school teachers always; standalone teachers only inside their portal. */
export function standaloneCanOpen(isStandalone: boolean, href: string): boolean {
  if (!isStandalone) return true;
  return isStandaloneTeacherPathAllowed(href.split(/[?#]/)[0] ?? href);
}

/** "Make a lesson": the AI Units builder for standalone teachers, the lesson-plan tool for school teachers. */
export function lessonBuilderHref(isStandalone: boolean): string {
  return isStandalone ? '/teacher/courses/new' : '/teacher/lessons/new';
}
