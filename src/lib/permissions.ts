// MIRROR OF campusly-backend/src/common/permissions.ts — keep in lockstep.
// When modifying rules, update BOTH files and both permissions.snapshot.json
// files (must be byte-identical), then run:
//   scripts/check-permissions-sync.sh <sibling-repo-path>

import type { User } from '@/types';

export type Capability =
  | 'manage_school_settings'
  | 'manage_school_config'
  | 'manage_academic_setup'
  | 'manage_users'
  | 'manage_fees'
  | 'manage_pastoral'
  | 'manage_sport_config'
  | 'manage_library'
  | 'manage_visitors'
  | 'view_audit_log';

const isSuper = (u: User): boolean => u.role === 'super_admin';
const isSchoolAdmin = (u: User): boolean =>
  u.role === 'school_admin' || u.isSchoolPrincipal === true;

export const CAPABILITY_RULES: Record<Capability, (u: User) => boolean> = {
  manage_school_settings:  (u) => isSchoolAdmin(u) || u.isStandaloneTeacher === true,
  manage_school_config:    (u) => isSchoolAdmin(u) || u.isStandaloneTeacher === true,
  manage_academic_setup:   (u) => isSchoolAdmin(u) || u.isHOD === true || u.isStandaloneTeacher === true,
  manage_users:            (u) => isSchoolAdmin(u),
  manage_fees:             (u) => isSchoolAdmin(u) || u.isBursar === true,
  manage_pastoral:         (u) => isSchoolAdmin(u) || u.isCounselor === true,
  manage_sport_config:     (u) => isSchoolAdmin(u) || u.role === 'sports_manager' || u.isStandaloneCoach === true,
  manage_library:          (u) => isSchoolAdmin(u),
  manage_visitors:         (u) => isSchoolAdmin(u) || u.isReceptionist === true,
  view_audit_log:          (u) => isSchoolAdmin(u),
};

export function can(user: User | null | undefined, cap: Capability): boolean {
  if (!user) return false;
  if (isSuper(user)) return true;
  return CAPABILITY_RULES[cap](user);
}
