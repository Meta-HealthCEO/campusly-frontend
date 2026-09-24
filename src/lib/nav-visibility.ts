import type { NavItem } from '@/lib/constants';
import type { PermissionFlag } from '@/types';

export interface NavAccess {
  isModuleEnabled: (moduleId: string) => boolean;
  hasPermission: (flag: PermissionFlag) => boolean;
}

/** Items (and their children) this user may see. A group left with no visible children disappears. */
export function visibleNavItems(items: NavItem[], access: NavAccess): NavItem[] {
  const isVisible = (item: NavItem): boolean =>
    (!item.module || access.isModuleEnabled(item.module)) &&
    (!item.permission || access.hasPermission(item.permission));

  return items.filter(isVisible).flatMap((item: NavItem) => {
    if (!item.children) return [item];
    const children = item.children.filter(isVisible);
    return children.length > 0 ? [{ ...item, children }] : [];
  });
}

export const PHONE_TAB_COUNT = 4;

/**
 * Phone bottom nav: the first four top-level items are tabs. Every other
 * link, including items nested inside groups, goes in the More sheet, so
 * nothing is unreachable on a phone.
 */
export function phoneNavLayout(items: NavItem[]): { primary: NavItem[]; sheet: NavItem[] } {
  const primary = items.slice(0, PHONE_TAB_COUNT);
  const tabHrefs = new Set(primary.map((item: NavItem) => item.href));
  const seen = new Set<string>();
  const sheet: NavItem[] = [];
  for (const item of items) {
    const links = item.children && item.children.length > 0 ? item.children : [item];
    for (const link of links) {
      if (tabHrefs.has(link.href) || seen.has(link.href)) continue;
      seen.add(link.href);
      sheet.push(link);
    }
  }
  return { primary, sheet };
}
