'use client';

import Link from 'next/link';
import { ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/constants';

interface SidebarNavItemProps {
  item: NavItem;
  pathname: string;
  active: boolean;
  collapsed: boolean;
  expanded: boolean;
  /** Live count text for this item (teacher portal), or null for none. */
  countText?: string | null;
  onToggle: (href: string) => void;
  onNavigate: () => void;
}

/** One sidebar entry. Teacher-portal styling sits behind the `teacher:` variant; other portals are unchanged. */
export function SidebarNavItem({
  item, pathname, active, collapsed, expanded, countText = null, onToggle, onNavigate,
}: SidebarNavItemProps) {
  const hasChildren = !!item.children && item.children.length > 0;
  const Icon = item.icon;

  return (
    <div>
      <Link
        href={item.href}
        onClick={(e) => {
          if (hasChildren && !collapsed) {
            // Parent items with children never navigate: they only toggle the submenu.
            e.preventDefault();
            onToggle(item.href);
            return;
          }
          onNavigate();
        }}
        aria-current={active ? 'page' : undefined}
        aria-expanded={hasChildren ? expanded : undefined}
        className={cn(
          'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors teacher:py-2',
          active
            ? cn(
              'bg-primary/10 text-primary',
              'teacher:bg-sidebar-accent teacher:text-sidebar-primary',
              'teacher:before:absolute teacher:before:-left-3 teacher:before:top-2 teacher:before:bottom-2 teacher:before:w-[3px] teacher:before:rounded-r teacher:before:bg-sidebar-ring',
            )
            : cn(
              'text-muted-foreground hover:bg-muted hover:text-foreground',
              'teacher:text-sidebar-foreground teacher:hover:bg-sidebar-accent teacher:hover:text-sidebar-primary',
            ),
        )}
      >
        <Icon className="h-5 w-5 shrink-0 teacher:h-[18px] teacher:w-[18px]" />
        {!collapsed && (
          <>
            <span className="truncate">{item.label}</span>
            {item.badge === 'AI' ? (
              <>
                <span className="ml-auto rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground teacher:hidden">
                  {item.badge}
                </span>
                <Sparkles aria-label="AI" className="ml-auto hidden h-3.5 w-3.5 shrink-0 text-sidebar-ring teacher:block" />
              </>
            ) : item.badge ? (
              <span className="ml-auto rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">
                {item.badge}
              </span>
            ) : null}
            {countText && (
              <span className={cn('rounded-full bg-sidebar-accent px-2 py-px font-mono text-[11px] text-sidebar-primary', !item.badge && 'ml-auto')}>
                {countText}
              </span>
            )}
            {hasChildren && (
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 transition-transform', !item.badge && !countText && 'ml-auto', expanded && 'rotate-180')}
              />
            )}
          </>
        )}
      </Link>
      {!collapsed && expanded && item.children && (
        <div className="ml-8 mt-1 space-y-1">
          {item.children.map((child: NavItem) => {
            // A "Home/Overview" child shares the parent's href: match it exactly.
            const isHomeChild = child.href === item.href;
            const childActive = isHomeChild
              ? pathname === child.href
              : pathname === child.href || pathname.startsWith(child.href + '/');
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  'block rounded-md px-3 py-1.5 text-sm transition-colors',
                  childActive ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground',
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
}
