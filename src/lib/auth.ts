import type { UserRole } from '@/types';

export function getStoredTokens() {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken') ?? '';
  if (!accessToken) return null;
  return { accessToken, refreshToken };
}

export function setStoredTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearStoredTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getRoleDashboardPath(role: string): string {
  const paths: Record<string, string> = {
    admin: '/admin',
    school_admin: '/admin',
    teacher: '/teacher',
    parent: '/parent',
    student: '/student',
    tuckshop: '/tuckshop',
    super_admin: '/superadmin',
    coach: '/coach',
    sports_manager: '/coach',
  };
  return paths[role] ?? '/login';
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Administrator',
    school_admin: 'School Admin',
    teacher: 'Teacher',
    parent: 'Parent',
    student: 'Student',
    tuckshop: 'Tuck Shop',
    super_admin: 'Super Admin',
    sgb_member: 'SGB Member',
    coach: 'Coach',
    sports_manager: 'Sports Manager',
  };
  return labels[role];
}

/**
 * Path to the role's profile page, or null if that role has no dedicated
 * profile page (in which case the user menu should hide the Profile item
 * and rely on Settings — which usually contains the profile info).
 */
export function getRoleProfilePath(role: string): string | null {
  const paths: Record<string, string> = {
    student: '/student/profile',
  };
  return paths[role] ?? null;
}

/**
 * Path to the role's settings page, or null if that role has no settings
 * page yet. Students do NOT have a separate settings page — preferences
 * + security are merged into `/student/profile`, so this returns null for
 * the student role and the user menu hides the Settings item for them.
 */
export function getRoleSettingsPath(role: string): string | null {
  const paths: Record<string, string> = {
    admin: '/admin/settings',
    school_admin: '/admin/settings',
    teacher: '/teacher/settings',
    parent: '/parent/settings',
  };
  return paths[role] ?? null;
}
