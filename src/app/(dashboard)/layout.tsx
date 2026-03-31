'use client';

import { useEffect, useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  ADMIN_NAV,
  PARENT_NAV,
  STUDENT_NAV,
  TEACHER_NAV,
  SUPERADMIN_NAV,
  type NavItem,
} from '@/lib/constants';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useNotificationPoller } from '@/hooks/useNotificationPoller';
import type { UserRole } from '@/types';

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  admin: ADMIN_NAV,
  parent: PARENT_NAV,
  student: STUDENT_NAV,
  teacher: TEACHER_NAV,
  tuckshop: ADMIN_NAV,
  super_admin: SUPERADMIN_NAV,
};

function filterByModule(items: NavItem[], enabledModules: string[]): NavItem[] {
  return items.filter((item) => {
    if (!item.module) return true;
    return enabledModules.includes(item.module);
  });
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  const { school, fetchSchool } = useSchoolStore();

  // Poll for unread notification count
  useNotificationPoller();

  // Load school data on mount when user has a schoolId
  useEffect(() => {
    if (user?.schoolId && !school) {
      fetchSchool(user.schoolId);
    }
  }, [user?.schoolId, school, fetchSchool]);

  const navItems = useMemo(() => {
    if (!user) return ADMIN_NAV;
    const roleNav = NAV_BY_ROLE[user.role] ?? ADMIN_NAV;
    if (!school) return roleNav;
    return filterByModule(roleNav, school.modulesEnabled);
  }, [user, school]);

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-muted/30">
        <Sidebar items={navItems} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
            {children}
          </main>
        </div>
        <BottomNav items={navItems} />
      </div>
    </AuthGuard>
  );
}
