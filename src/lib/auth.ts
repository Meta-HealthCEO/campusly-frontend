import type { UserRole } from '@/types';

export function getStoredTokens() {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  if (!accessToken || !refreshToken) return null;
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
  };
  return paths[role] ?? '/login';
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Administrator',
    teacher: 'Teacher',
    parent: 'Parent',
    student: 'Student',
    tuckshop: 'Tuck Shop',
    super_admin: 'Super Admin',
  };
  return labels[role];
}
