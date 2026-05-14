'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const CHANGE_PASSWORD_PATH = '/auth/change-password';

export function MustChangePasswordGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.mustChangePassword === true && pathname !== CHANGE_PASSWORD_PATH) {
      router.replace(CHANGE_PASSWORD_PATH);
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (user?.mustChangePassword === true && pathname !== CHANGE_PASSWORD_PATH) {
    // Redirect in-flight — render nothing to avoid flashing protected content.
    return null;
  }
  return <>{children}</>;
}
