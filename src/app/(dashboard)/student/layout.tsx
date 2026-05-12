import type { ReactNode } from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function StudentLayout({ children }: { children: ReactNode }) {
  // RoleGuard enforces student-only access. The parent (dashboard)/layout.tsx
  // already renders the sidebar, top bar, and bottom nav with role-filtered
  // items via NAV_BY_ROLE[user.role] + filterByModule, so this layout adds
  // only role enforcement on top.
  return <RoleGuard role="student">{children}</RoleGuard>;
}
