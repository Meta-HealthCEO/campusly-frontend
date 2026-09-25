/** Phase D's in-scope routes (plan ruling R2) and the widths the gate checks (spec §7). */
export const WIDTHS = [320, 375, 768, 1024, 1280, 1440] as const;

/** Signed out. `/design` is dev-only and absent before Task 12 (a 404 is skipped, not failed). */
export const PUBLIC_ROUTES: readonly string[] = [
  '/', '/teachers', '/login', '/signup/teacher', '/signup/coach', '/register-student',
  '/verify-email', '/forgot-password', '/reset-password', '/design',
];

/** Signed in as the standalone teacher (dev sign-in panel). */
export const TEACHER_ROUTES: readonly string[] = [
  '/teacher', '/teacher/onboarding', '/teacher/courses', '/teacher/courses/new', '/teacher/curriculum/textbooks',
  '/teacher/homework', '/teacher/homework/new', '/teacher/papers', '/teacher/papers/new',
  '/teacher/workbench/marking-hub', '/teacher/curriculum/mark-papers', '/teacher/grades', '/teacher/classes',
  '/teacher/students', '/teacher/attendance', '/teacher/attendance/report', '/teacher/assignments',
  '/teacher/assignments/new', '/teacher/settings', '/teacher/settings/join-school', '/my/billing', '/subscription',
];

/**
 * Signed in as the dev school learner (Lebo, dev sign-in panel): the learner pages the learner-portal work touches.
 * School learners must see no change (learner portal spec §1), so their request sets are compared with the baseline
 * recorded on the code before that work.
 */
export const SCHOOL_LEARNER_ROUTES: readonly string[] = [
  '/student', '/student/courses', '/student/homework', '/student/tests', '/student/grades', '/student/ai-tutor', '/student/profile',
];

export interface DetailRoute { name: string; list: string; link: RegExp }

/** Pages with an id: found from the first matching link on the list page (ruling R15). */
export const DETAIL_ROUTES: readonly DetailRoute[] = [
  { name: 'lesson', list: '/teacher/courses', link: /^\/teacher\/courses\/(?!new$)[^/?#]+$/ },
  { name: 'textbook', list: '/teacher/curriculum/textbooks', link: /^\/teacher\/curriculum\/textbooks\/[^/?#]+$/ },
  { name: 'homework', list: '/teacher/homework', link: /^\/teacher\/homework\/(?!new$)[^/?#]+$/ },
  { name: 'paper', list: '/teacher/papers', link: /^\/teacher\/papers\/(?!new$)[^/?#]+$/ },
  { name: 'learner', list: '/teacher/students', link: /^\/teacher\/students\/[^/?#]+$/ },
  { name: 'roster', list: '/teacher/classes', link: /^\/teacher\/classes\/[^/?#]+\/roster$/ },
  { name: 'assignment', list: '/teacher/assignments', link: /^\/teacher\/assignments\/(?!new$)[^/?#]+$/ },
];

/** Signed in as a standalone teacher's learner (signed up through the invite link). */
export const LEARNER_ROUTES: readonly string[] = [
  '/student', '/student/courses', '/student/homework', '/student/tests', '/student/grades',
  '/student/ai-tutor', '/student/ai-tutor/practice', '/student/ai-tutor/practice/history', '/student/profile',
];

export const LEARNER_DETAIL_ROUTES: readonly DetailRoute[] = [
  { name: 'learner lesson', list: '/student/courses', link: /^\/student\/courses\/[^/?#]+$/ },
  { name: 'learner homework', list: '/student/homework', link: /^\/student\/homework\/[^/?#]+$/ },
  { name: 'learner project', list: '/student/homework', link: /^\/student\/assignments\/[^/?#]+$/ },
  { name: 'learner test', list: '/student/tests', link: /^\/student\/tests\/[^/?#]+$/ },
];

/** Calls on a timer, not part of a page's behaviour. */
export const POLLING: readonly RegExp[] = [
  /^GET \/api\/notifications/,
  // /teacher/papers/new lists curriculum nodes only when its framework loads before the network settles:
  // seen once in two runs on the same code, so it is timing, not behaviour.
  /^GET \/api\/curriculum-structure\/nodes$/,
];
