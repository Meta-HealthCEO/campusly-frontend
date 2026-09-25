'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { useSchoolData } from '@/hooks/useSchoolData';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  ADMIN_NAV,
  PARENT_NAV,
  STUDENT_NAV,
  TEACHER_NAV,
  STANDALONE_TEACHER_NAV,
  SUPERADMIN_NAV,
  COACH_NAV,
  type NavItem,
} from '@/lib/constants';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { BannerStrip } from '@/components/layout/BannerStrip';
import { AILimitDialog } from '@/components/billing/AILimitDialog';
import { composeNav } from './nav-config';
import { STANDALONE_STUDENT_NAV } from '@/lib/nav/student-nav';
import { portalRedirect } from '@/lib/portal-guard';
import { useNotificationPoller } from '@/hooks/useNotificationPoller';
import type { UserRole, PermissionFlag } from '@/types';

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  admin: ADMIN_NAV,
  school_admin: ADMIN_NAV,
  parent: PARENT_NAV,
  student: STUDENT_NAV,
  teacher: TEACHER_NAV,
  tuckshop: ADMIN_NAV,
  super_admin: SUPERADMIN_NAV,
  sgb_member: [],
  coach: COACH_NAV,
  sports_manager: COACH_NAV,
};

const MODULE_ALIASES: Record<string, string> = {
  fees: 'fee',
  sports: 'sport',
  events: 'event',
  tuck_shop: 'tuckshop',
};

function normalizeModuleName(moduleName: string): string {
  return MODULE_ALIASES[moduleName] ?? moduleName;
}

function filterByModule(items: NavItem[], enabledModules: string[]): NavItem[] {
  const normalizedModules = new Set(enabledModules.map(normalizeModuleName));
  return items.filter((item) => {
    if (!item.module) return true;
    return normalizedModules.has(normalizeModuleName(item.module));
  });
}

function filterByPermission(
  items: NavItem[],
  hasPermission: (flag: PermissionFlag) => boolean,
): NavItem[] {
  return items.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const school = useSchoolStore((s) => s.school);
  const { fetchSchool } = useSchoolData();
  const pathname = usePathname();
  const router = useRouter();

  // Poll for unread notification count
  useNotificationPoller();

  // Load school data on mount when user has a schoolId
  useEffect(() => {
    if (user?.schoolId && !school) {
      fetchSchool(user.schoolId);
    }
  }, [user?.schoolId, school, fetchSchool]);

  const redirectTo = portalRedirect(user, pathname);
  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  const navItems = useMemo(() => {
    if (!user) return ADMIN_NAV;
    if (user.isStandaloneTeacher) return STANDALONE_TEACHER_NAV;
    if (user.isStandaloneLearner) return STANDALONE_STUDENT_NAV;
    const roleBaseline = NAV_BY_ROLE[user.role] ?? ADMIN_NAV;
    const composed = composeNav(user, roleBaseline);
    const enabledModules = school?.modulesEnabled ?? [];
    const moduleFiltered = user.role === 'student' || school
      ? filterByModule(composed, enabledModules)
      : composed;
    return filterByPermission(moduleFiltered, hasPermission);
  }, [user, school, hasPermission]);

  if (redirectTo) return null;

  return (
    <AuthGuard>
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        <Sidebar items={navItems} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar items={navItems} />
          <BannerStrip />
          {/* <main> stays the scroll container (ruling R23). */}
          <main className="flex-1 overflow-y-auto px-4 pt-5 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:px-6 md:pt-6 md:pb-10 lg:px-8 lg:pt-8">
            <div className="mx-auto w-full max-w-[1200px]">{children}</div>
          </main>
        </div>
        <BottomNav items={navItems} />
        {/* The one prompt any refused AI action opens (out of AI actions, or email not verified). */}
        <AILimitDialog />
      </div>
    </AuthGuard>
  );
}
