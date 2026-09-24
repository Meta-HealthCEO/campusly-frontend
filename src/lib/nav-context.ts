import type { NavItem, NavSection } from '@/lib/constants';

/** The nav entry a page belongs to: exact match, else the longest href that prefixes it (Today only matches itself). */
export function navContextFor(pathname: string, items: NavItem[]): { section: NavSection | null; label: string } | null {
  const flat = items.flatMap((item: NavItem) =>
    item.children?.length ? item.children.map((c: NavItem) => ({ ...c, section: item.section })) : [item]);
  let best: NavItem | null = null;
  for (const item of flat) {
    const exact = pathname === item.href;
    const prefix = item.href !== '/teacher' && pathname.startsWith(`${item.href}/`);
    if ((exact || prefix) && (!best || item.href.length > best.href.length)) best = item;
  }
  return best ? { section: best.section ?? null, label: best.label } : null;
}
