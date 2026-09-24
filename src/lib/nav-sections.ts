import type { NavItem, NavSection } from '@/lib/constants';

export interface NavGroup {
  section: NavSection | null;
  items: NavItem[];
}

/** Consecutive items with the same section become one group; a nav without sections is one unlabelled group. */
export function groupNavBySection(items: NavItem[]): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const item of items) {
    const section = item.section ?? null;
    const last = groups[groups.length - 1];
    if (last && last.section === section) last.items.push(item);
    else groups.push({ section, items: [item] });
  }
  return groups;
}
