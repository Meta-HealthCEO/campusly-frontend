import type { NavItem } from '@/lib/constants';

/** Teacher navs group items into sections; other portals are flat. */
export function isSectioned(items: readonly NavItem[]): boolean {
  return items.some((item: NavItem) => item.section);
}

/**
 * Whether `item` is the current page's nav entry. Sectioned navs are flat, so a page below an item
 * (a lesson under Lessons) highlights it too; a one-segment href like /teacher only matches itself.
 */
export function isNavItemActive(pathname: string, item: NavItem, sectioned: boolean): boolean {
  const deep = item.href.split('/').filter(Boolean).length > 1;
  const own = pathname === item.href || (sectioned && deep && pathname.startsWith(`${item.href}/`));
  return own || (item.children?.some((c: NavItem) => pathname === c.href || pathname.startsWith(`${c.href}/`)) ?? false);
}
