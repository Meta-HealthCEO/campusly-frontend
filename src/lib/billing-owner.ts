import type { User } from '@/types';

/** 'admin' is how the app names a school_admin (user-from-api.ts). */
const SCHOOL_BILLING_ROLES = new Set(['admin', 'school_admin', 'super_admin']);

/** Whoever pays — the rule the billing routes use (backend require-billing-owner.ts). */
export function isBillingOwner(
  user: Pick<User, 'role' | 'isSchoolPrincipal' | 'isStandaloneTeacher' | 'isStandaloneCoach'> | null,
): boolean {
  if (!user) return false;
  return user.isStandaloneTeacher === true
    || user.isStandaloneCoach === true
    || user.isSchoolPrincipal === true
    || SCHOOL_BILLING_ROLES.has(user.role);
}
