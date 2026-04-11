'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useModule } from '@/hooks/useModule';
import { ChevronLeft, ChevronDown, GraduationCap } from 'lucide-react';
import type { NavItem } from '@/lib/constants';

interface SidebarProps {
  items: NavItem[];
}

export function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebarCollapse, sidebarOpen, setSidebarOpen } = useUIStore();
  const { isModuleEnabled } = useModule();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const isItemVisible = (item: NavItem) => {
    if (item.module && !isModuleEnabled(item.module)) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  };

  const filteredItems = items
    .filter(isItemVisible)
    .map((item) => {
      if (!item.children) return item;
      const visibleChildren = item.children.filter(isItemVisible);
      // If a parent group ends up with zero visible children, hide the whole group.
      if (visibleChildren.length === 0) return null;
      return { ...item, children: visibleChildren };
    })
    .filter((item): item is NavItem => item !== null);

  const isItemActive = (item: NavItem) =>
    pathname === item.href ||
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
          sidebarCollapsed ? 'w-17.5' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!sidebarCollapsed && (
            <Link href="/" className="flex items-center gap-2">
              <GraduationCap className="h-7 w-7 text-[#2563eb]" />
              <span className="text-lg font-bold">Campusly</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <Link href="/" className="mx-auto">
              <GraduationCap className="h-7 w-7 text-[#2563eb]" />
            </Link>
          )}
          <button
            onClick={toggleSidebarCollapse}
            className="hidden lg:flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {filteredItems.map((item) => {
            const isActive = isItemActive(item);
            const hasChildren = !!item.children && item.children.length > 0;
            const isExpanded = hasChildren && expandedItems.has(item.href);
            const Icon = item.icon;

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={(e) => {
                    if (hasChildren && !sidebarCollapsed) {
                      // Parent items with children never navigate — they only toggle the submenu.
                      // Use the "Home" child (or any explicit child) to reach the parent's landing page.
                      e.preventDefault();
                      toggleExpanded(item.href);
                      return;
                    }
                    setSidebarOpen(false);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  aria-expanded={hasChildren ? isExpanded : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                      {hasChildren && (
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 transition-transform',
                            !item.badge && 'ml-auto',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      )}
                    </>
                  )}
                </Link>
                {!sidebarCollapsed && isExpanded && item.children && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => {
                      // A "Home/Overview" child shares the parent's href — match it exactly so
                      // it doesn't highlight on every sub-route of the section.
                      const isHomeChild = child.href === item.href;
                      const childActive = isHomeChild
                        ? pathname === child.href
                        : pathname === child.href || pathname.startsWith(child.href + '/');
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'block rounded-md px-3 py-1.5 text-sm transition-colors',
                            childActive ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
