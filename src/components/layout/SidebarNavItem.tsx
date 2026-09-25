'use client';

import Link from 'next/link';
import { ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/components/ui/focus';
import type { NavItem } from '@/lib/constants';

interface SidebarNavItemProps {
  item: NavItem;
  pathname: string;
  active: boolean;
  collapsed: boolean;
  expanded: boolean;
  /** Live count text for this item, or null for none. */
  countText?: string | null;
  onToggle: (href: string) => void;
  onNavigate: () => void;
}

/** One sidebar entry: 40px row, accent fill when current; icon-only (named) in the rail. */
export function SidebarNavItem({ item, pathname, active, collapsed, expanded, countText = null, onToggle, onNavigate }: SidebarNavItemProps) {
  const hasChildren = !!item.children && item.children.length > 0;
  const Icon = item.icon;
  return (
    <div>
      <Link
        href={item.href}
        onClick={(e) => {
          // Parent items with children never navigate from the full nav: they only toggle the submenu.
          if (hasChildren && !collapsed) {
            e.preventDefault();
            onToggle(item.href);
            return;
          }
          onNavigate();
        }}
        aria-current={active ? 'page' : undefined}
        aria-expanded={hasChildren && !collapsed ? expanded : undefined}
        aria-label={collapsed ? item.label : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          'relative flex min-h-10 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors duration-150',
          FOCUS_RING,
          collapsed && 'justify-center px-0',
          active ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Icon className="size-[18px] shrink-0" aria-hidden="true" />
        {!collapsed && (
          <>
            <span className="truncate">{item.label}</span>
            {item.badge === 'AI' ? (
              <Sparkles aria-label="AI" className="ml-auto size-3.5 shrink-0 text-primary" />
            ) : item.badge ? (
              <span className="ml-auto rounded-full bg-accent px-2 text-caption font-semibold text-accent-foreground">{item.badge}</span>
            ) : null}
            {countText && (
              <span className={cn('rounded-full bg-accent px-2 text-caption font-semibold tabular-nums text-accent-foreground', !item.badge && 'ml-auto')}>
                {countText}
              </span>
            )}
            {hasChildren && (
              <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 transition-transform duration-150', !item.badge && !countText && 'ml-auto', expanded && 'rotate-180')} />
            )}
          </>
        )}
      </Link>
      {!collapsed && expanded && item.children && (
        <div className="ml-9 mt-0.5 space-y-0.5">
          {item.children.map((child: NavItem) => {
            // A "Home/Overview" child shares the parent's href: match it exactly.
            const childActive = child.href === item.href ? pathname === child.href : pathname === child.href || pathname.startsWith(`${child.href}/`);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                aria-current={childActive ? 'page' : undefined}
                className={cn('flex min-h-9 items-center rounded-control px-3 text-sm', FOCUS_RING, childActive ? 'font-semibold text-accent-foreground' : 'text-sidebar-foreground hover:text-foreground')}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
