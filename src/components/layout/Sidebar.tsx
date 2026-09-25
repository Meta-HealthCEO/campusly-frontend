'use client';

import { useState, type ReactNode } from 'react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarNav } from './SidebarNav';
import type { NavItem } from '@/lib/constants';

interface SidebarProps {
  items: NavItem[];
}

const RAIL_BUTTON = cn('mx-2 flex min-h-10 items-center justify-center rounded-control text-sidebar-foreground hover:bg-muted hover:text-foreground', FOCUS_RING);

/** An icon-only rail control: its name shows in a tooltip on hover and keyboard focus (final review 3). */
function RailButton({ label, onClick, className, children }: { label: string; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<button type="button" onClick={onClick} aria-label={label} className={cn(RAIL_BUTTON, className)} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

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

      {/* Tablet: the rail is icons only; "All pages" (top of the rail) opens the full nav, with group children, in a sheet. */}
      <div className="flex flex-1 flex-col overflow-hidden lg:hidden">
        <RailButton label="Open all pages" onClick={() => setAllPagesOpen(true)} className="mt-3 mb-1">
          <PanelLeft className="size-[18px]" aria-hidden="true" />
        </RailButton>
        <SidebarNav items={visible} collapsed counts={counts} onNavigate={() => undefined} />
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
          <RailButton label="Expand sidebar" onClick={toggleSidebarCollapse} className="mb-3">
            <ChevronLeft className="size-4 rotate-180" aria-hidden="true" />
          </RailButton>
        ) : user && (
          <div className="flex items-center gap-2.5 border-t border-sidebar-border px-4 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground">
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
