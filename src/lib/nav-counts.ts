import type { NavItem } from '@/lib/constants';

export interface NavCounts {
  marking: number | null;
  messages: number | null;
}

export function navBadgeText(countKey: NavItem['countKey'], counts: NavCounts): string | null {
  if (!countKey) return null;
  const n = counts[countKey];
  if (n === null || n <= 0) return null;
  return n > 99 ? '99+' : String(n);
}
