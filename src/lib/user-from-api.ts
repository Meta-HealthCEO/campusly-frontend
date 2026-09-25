import type { User, UserRole } from '@/types';

/** The user object as /auth/login and /auth/me return it. */
export type ApiUser = Record<string, unknown>;

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

/**
 * The app's User from the API's user object. Login, session restore and
 * password change all build the user here, so every flag (including an HOD's
 * department) survives a page reload.
 */
export function userFromApi(raw: ApiUser): User {
  const role = raw.role === 'school_admin' ? 'admin' : (raw.role as UserRole);
  return {
    id: str(raw._id) || str(raw.id),
    email: str(raw.email),
    firstName: str(raw.firstName),
    lastName: str(raw.lastName),
    role,
    phone: str(raw.phone),
    schoolId: str(raw.schoolId),
    isActive: typeof raw.isActive === 'boolean' ? raw.isActive : true,
    isSchoolPrincipal: raw.isSchoolPrincipal === true,
    isHOD: raw.isHOD === true,
    departmentId: str(raw.departmentId) || null,
    isBursar: raw.isBursar === true,
    isCounselor: raw.isCounselor === true,
    isReceptionist: raw.isReceptionist === true,
    isStandaloneTeacher: raw.isStandaloneTeacher === true,
    isStandaloneCoach: raw.isStandaloneCoach === true,
    mustChangePassword: raw.mustChangePassword === true,
    emailVerifiedAt: str(raw.emailVerifiedAt) || null,
    avatar: str(raw.profileImage) || str(raw.avatar) || undefined,
    createdAt: str(raw.createdAt),
    updatedAt: str(raw.updatedAt),
  };
}
