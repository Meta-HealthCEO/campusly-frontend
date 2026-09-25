'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { groupNavBySection } from '@/lib/nav-sections';
import { navBadgeText, type NavCounts } from '@/lib/nav-counts';
import { isNavItemActive, isSectioned } from '@/lib/shell/nav-active';
import { SidebarNavItem } from './SidebarNavItem';
import type { NavItem } from '@/lib/constants';

interface SidebarNavProps {
  items: NavItem[];
  collapsed: boolean;
  counts: NavCounts;
  onNavigate: () => void;
}

/** The portal's nav in its sections: in the desktop sidebar, the tablet rail and the tablet "all pages" sheet. */
export function SidebarNav({ items, collapsed, counts, onNavigate }: SidebarNavProps) {
  const pathname = usePathname() ?? '';
  const sectioned = isSectioned(items);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(items.filter((i: NavItem) => i.children && isNavItemActive(pathname, i, sectioned)).map((i: NavItem) => i.href)),
  );
  const toggle = (href: string) => setExpanded((prev: Set<string>) => {
    const next = new Set(prev);
    if (next.has(href)) next.delete(href);
    else next.add(href);
    return next;
  });

  return (
    <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3 lg:px-3">
      {groupNavBySection(items).map((group) => (
        <div key={group.section ?? 'all'} className="space-y-0.5">
          {group.section && group.section !== 'Today' && !collapsed && (
            <p className="px-3 pb-1 pt-4 text-eyebrow font-semibold uppercase text-sidebar-label">{group.section}</p>
          )}
          {group.items.map((item: NavItem) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              pathname={pathname}
              active={isNavItemActive(pathname, item, sectioned)}
              collapsed={collapsed}
              expanded={expanded.has(item.href)}
              countText={navBadgeText(item.countKey, counts)}
              onToggle={toggle}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}
