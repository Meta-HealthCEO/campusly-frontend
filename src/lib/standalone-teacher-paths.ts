/**
 * Independent (standalone) teachers get a focused slice of the teacher
 * portal. The dashboard layout bounces them to /teacher from anything else,
 * so every link in STANDALONE_TEACHER_NAV — and every in-page link those
 * pages render — must resolve to one of these prefixes.
 */
const STANDALONE_TEACHER_PREFIXES = [
  '/teacher/onboarding',
  '/teacher/classes',
  '/teacher/students',
  '/teacher/attendance',
  // Class units: onboarding's first lesson opens the builder here.
  '/teacher/courses',
  '/teacher/curriculum/textbooks',
  '/teacher/curriculum/content',
  '/teacher/curriculum/preview',
  '/teacher/curriculum/mark-papers',
  '/teacher/workbench/marking-hub',
  '/teacher/lesson-plans',
  '/teacher/lessons',
  '/teacher/quick-make',
  '/teacher/papers',
  '/teacher/grades',
  '/teacher/homework',
  '/teacher/assignments',
  '/teacher/curriculum/import',
  '/teacher/settings',
  '/my/billing',
  '/subscription',
] as const;

export function isStandaloneTeacherPathAllowed(pathname: string): boolean {
  if (pathname === '/teacher') return true;
  return STANDALONE_TEACHER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
