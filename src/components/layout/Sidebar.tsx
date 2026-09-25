'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, GraduationCap, PanelLeft } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { useModule } from '@/hooks/useModule';
import { useTeacherNavCounts } from '@/hooks/useTeacherNavCounts';
import { visibleNavItems } from '@/lib/nav-visibility';
import { FOCUS_RING } from '@/components/ui/focus';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SidebarNav } from './SidebarNav';
import type { NavItem } from '@/lib/constants';

interface SidebarProps {
  items: NavItem[];
}

const RAIL_BUTTON = cn('mx-2 mb-3 flex min-h-10 items-center justify-center rounded-control text-sidebar-foreground hover:bg-muted hover:text-foreground', FOCUS_RING);

/** Spec §3: 232px sidebar from 1024px (collapsible to the rail), 56px rail from 768px, hidden on phones. */
export function Sidebar({ items }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebarCollapse } = useUIStore();
  const { isModuleEnabled } = useModule();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);
  const schoolName = useSchoolStore((s) => s.school?.name ?? '');
  const counts = useTeacherNavCounts(user?.role === 'teacher');
  const [allPagesOpen, setAllPagesOpen] = useState(false);
  const visible = visibleNavItems(items, { isModuleEnabled, hasPermission });

  return (
    <aside
      data-collapsed={sidebarCollapsed}
      className={cn(
        'sticky top-0 hidden md:flex h-dvh w-14 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
        'transition-[width] duration-250 ease-standard lg:w-[232px] data-[collapsed=true]:lg:w-14',
      )}
    >
      {/* In the 56px rail only the mark fits; the collapse control sits here only when the sidebar is open. */}
      <div className={cn('flex h-16 shrink-0 items-center justify-center gap-2 border-b border-sidebar-border px-2', !sidebarCollapsed && 'lg:justify-between lg:px-4')}>
        <Link href="/" className={cn('flex items-center gap-2 rounded-control', FOCUS_RING)} aria-label="Campusly home">
          <span className="grid size-8 place-items-center rounded-control bg-primary text-primary-foreground">
            <GraduationCap className="size-4" aria-hidden="true" />
          </span>
          {!sidebarCollapsed && (
            <span className="hidden font-heading text-lg font-bold tracking-[-0.01em] text-sidebar-primary lg:inline">Campusly</span>
          )}
        </Link>
        {!sidebarCollapsed && (
          <button
            type="button"
            onClick={toggleSidebarCollapse}
            aria-label="Collapse sidebar"
            className={cn('hidden size-8 items-center justify-center rounded-control text-sidebar-foreground hover:bg-muted hover:text-foreground lg:flex', FOCUS_RING)}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Tablet: the rail is icons only; the full nav (with group children) opens in a sheet. */}
      <div className="flex flex-1 flex-col overflow-hidden lg:hidden">
        <SidebarNav items={visible} collapsed counts={counts} onNavigate={() => undefined} />
        <button type="button" onClick={() => setAllPagesOpen(true)} aria-label="Open all pages" className={RAIL_BUTTON}>
          <PanelLeft className="size-[18px]" aria-hidden="true" />
        </button>
        <Sheet open={allPagesOpen} onOpenChange={setAllPagesOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="px-4 pt-4">All pages</SheetTitle>
            <SidebarNav items={visible} collapsed={false} counts={counts} onNavigate={() => setAllPagesOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: the full sidebar, or the rail when collapsed. */}
      <div className="hidden flex-1 flex-col overflow-hidden lg:flex">
        <SidebarNav items={visible} collapsed={sidebarCollapsed} counts={counts} onNavigate={() => undefined} />
        {sidebarCollapsed ? (
          <button type="button" onClick={toggleSidebarCollapse} aria-label="Expand sidebar" className={RAIL_BUTTON}>
            <ChevronLeft className="size-4 rotate-180" aria-hidden="true" />
          </button>
        ) : user && (
          <div className="flex items-center gap-2.5 border-t border-sidebar-border px-4 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {getInitials(user.firstName, user.lastName)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-sidebar-primary">{user.firstName} {user.lastName}</span>
              {schoolName && <span className="block truncate text-caption text-sidebar-label">{schoolName}</span>}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
