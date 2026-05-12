import type { ReactNode } from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { StudentSidebar } from '@/components/student/StudentSidebar';
import { StudentBottomNav } from '@/components/student/StudentBottomNav';

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="student">
      <div className="flex min-h-screen">
        <StudentSidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 lg:pb-6">
          {children}
        </main>
        <StudentBottomNav />
      </div>
    </RoleGuard>
  );
}
