import { MoreHorizontal } from 'lucide-react';
import { phoneNavLayout, phoneSectionLayout, type PhoneTab } from '@/lib/nav-visibility';
import type { NavItem } from '@/lib/constants';

/**
 * The phone tab bar: section tabs for sectioned (teacher) navs; otherwise the first four items and
 * More with every other link, nested ones included (spec §3, ruling R10).
 */
export function phoneTabs(items: NavItem[]): PhoneTab[] {
  const sections = phoneSectionLayout(items);
  if (sections) return sections;
  const { primary, sheet } = phoneNavLayout(items);
  const tabs: PhoneTab[] = primary.map((item: NavItem) => ({ key: item.href, label: item.label, icon: item.icon, href: item.href, items: [item] }));
  return sheet.length > 0 ? [...tabs, { key: 'More', label: 'More', icon: MoreHorizontal, items: sheet }] : tabs;
}

const under = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function isTabActive(pathname: string, tab: PhoneTab): boolean {
  if (tab.href) {
    const deep = tab.href.split('/').filter(Boolean).length > 1;
    return pathname === tab.href || (deep && pathname.startsWith(`${tab.href}/`));
  }
  return tab.items.some((item: NavItem) => under(pathname, item.href));
}
