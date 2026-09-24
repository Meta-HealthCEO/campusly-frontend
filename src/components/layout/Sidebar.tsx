'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeft, GraduationCap } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { useModule } from '@/hooks/useModule';
import { visibleNavItems } from '@/lib/nav-visibility';
import { groupNavBySection } from '@/lib/nav-sections';
import { SidebarNavItem } from './SidebarNavItem';
import type { NavItem } from '@/lib/constants';

interface SidebarProps {
  items: NavItem[];
}

export function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname() ?? '';
  const { sidebarCollapsed, toggleSidebarCollapse, sidebarOpen, setSidebarOpen } = useUIStore();
  const { isModuleEnabled } = useModule();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);
  const schoolName = useSchoolStore((s) => s.school?.name ?? '');

  const filteredItems = visibleNavItems(items, { isModuleEnabled, hasPermission });
  // Sectioned (teacher) navs are flat, so a page below an item (e.g. a lesson) highlights it too.
  const sectioned = filteredItems.some((item: NavItem) => item.section);
  const matches = (href: string) =>
    pathname === href || (sectioned && href.split('/').filter(Boolean).length > 1 && pathname.startsWith(`${href}/`));
  const isItemActive = (item: NavItem) =>
    matches(item.href) ||
    (item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + '/')) ?? false);

  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    filteredItems.forEach((item) => {
      if (item.children && isItemActive(item)) initial.add(item.href);
    });
    return initial;
  });

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-300 lg:relative lg:z-auto',
          'teacher:border-sidebar-border teacher:bg-sidebar teacher:text-sidebar-foreground',
          sidebarCollapsed ? 'w-17.5' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4 teacher:border-sidebar-border">
          <Link href="/" className={cn('flex items-center gap-2', sidebarCollapsed && 'mx-auto')}>
            <span className="teacher:grid teacher:h-7 teacher:w-7 teacher:place-items-center teacher:rounded-md teacher:bg-primary">
              <GraduationCap className="h-7 w-7 text-[#2563eb] teacher:h-4 teacher:w-4 teacher:text-white" />
            </span>
            {!sidebarCollapsed && (
              <span className="text-lg font-bold teacher:font-heading teacher:tracking-tight teacher:text-sidebar-primary">Campusly</span>
            )}
          </Link>
          <button
            onClick={toggleSidebarCollapse}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted teacher:hover:bg-sidebar-accent"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {groupNavBySection(filteredItems).map((group) => (
            <div key={group.section ?? 'all'} className="space-y-1">
              {group.section && group.section !== 'Today' && !sidebarCollapsed && (
                <p className="px-3 pb-1 pt-4 font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-sidebar-label">
                  {group.section}
                </p>
              )}
              {group.items.map((item: NavItem) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  active={isItemActive(item)}
                  collapsed={sidebarCollapsed}
                  expanded={expandedItems.has(item.href)}
                  onToggle={toggleExpanded}
                  onNavigate={() => setSidebarOpen(false)}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Me card (teacher portal) */}
        {!sidebarCollapsed && user && (
          <div className="hidden items-center gap-2.5 border-t border-sidebar-border px-4 py-3 teacher:flex">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#c4b5fd] text-xs font-semibold text-[#2e1065]">
              {getInitials(user.firstName, user.lastName)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-sidebar-primary">{user.firstName} {user.lastName}</span>
              {schoolName && <span className="block truncate text-xs text-sidebar-label">{schoolName}</span>}
            </span>
          </div>
        )}
      </aside>
    </>
  );
}
