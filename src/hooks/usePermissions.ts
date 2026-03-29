'use client';

import { useAuthStore } from '@/stores/useAuthStore';
import type { UserRole } from '@/types';

export function usePermissions() {
  const { user } = useAuthStore();

  const hasRole = (role: UserRole) => user?.role === role;
  const hasAnyRole = (...roles: UserRole[]) => roles.some((r) => user?.role === r);
  const isAdmin = () => user?.role === 'admin';
  const isTeacher = () => user?.role === 'teacher';
  const isParent = () => user?.role === 'parent';
  const isStudent = () => user?.role === 'student';

  return { hasRole, hasAnyRole, isAdmin, isTeacher, isParent, isStudent, user };
}
