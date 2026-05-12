'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { UserRole } from '@/types';

interface RoleGuardProps {
  role: UserRole;
  redirectTo?: string;
  children: ReactNode;
}

export function RoleGuard({ role, redirectTo, children }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }
    if (user.role !== role) {
      router.replace(redirectTo ?? `/${user.role}`);
    }
  }, [isLoading, isAuthenticated, user, role, redirectTo, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== role) {
    return null;
  }

  return <>{children}</>;
}
