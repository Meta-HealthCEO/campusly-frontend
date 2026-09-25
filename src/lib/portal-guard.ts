import type { User } from '@/types';
import { isStandaloneTeacherPathAllowed } from './standalone-teacher-paths';
import { isStandaloneStudentPathAllowed } from './standalone-student-paths';

/** Where a standalone teacher or learner on a page outside their portal is sent; null to stay. */
export function portalRedirect(user: Pick<User, 'isStandaloneTeacher' | 'isStandaloneLearner'> | null, pathname: string): string | null {
  if (user?.isStandaloneTeacher) return isStandaloneTeacherPathAllowed(pathname) ? null : '/teacher';
  if (user?.isStandaloneLearner) return isStandaloneStudentPathAllowed(pathname) ? null : '/student';
  return null;
}
