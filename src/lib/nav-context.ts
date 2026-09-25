import type { NavItem, NavSection } from '@/lib/constants';

/** Only an entry below a role's home (`/admin/students`, not `/admin`) may claim the pages under it. */
const canPrefix = (href: string): boolean => href.split('/').filter(Boolean).length > 1;

/**
 * The nav entry a page belongs to: exact match, else the longest nested href that prefixes it. A role's home entry
 * (Today, Dashboard) only matches itself, so a page with no nav entry falls back to the role name (final review 1).
 */
export function navContextFor(pathname: string, items: NavItem[]): { section: NavSection | null; label: string } | null {
  const flat = items.flatMap((item: NavItem) =>
    item.children?.length ? item.children.map((c: NavItem) => ({ ...c, section: item.section })) : [item]);
  let best: NavItem | null = null;
  for (const item of flat) {
    const exact = pathname === item.href;
    const prefix = canPrefix(item.href) && pathname.startsWith(`${item.href}/`);
    if ((exact || prefix) && (!best || item.href.length > best.href.length)) best = item;
  }
  return best ? { section: best.section ?? null, label: best.label } : null;
}
