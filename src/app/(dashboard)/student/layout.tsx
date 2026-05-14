import type { ReactNode } from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { MustChangePasswordGate } from '@/components/auth/MustChangePasswordGate';

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="student">
      <MustChangePasswordGate>
        {children}
      </MustChangePasswordGate>
    </RoleGuard>
  );
}
