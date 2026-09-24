import { MoreHorizontal, Sunrise, BookOpen, ClipboardCheck, Users, type LucideIcon } from 'lucide-react';
import { NAV_SECTIONS, type NavItem, type NavSection } from '@/lib/constants';
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

export interface PhoneTab {
  key: string;
  label: string;
  icon: LucideIcon;
  /** A direct link (Today); otherwise the tab opens a sheet of `items`. */
  href?: string;
  items: NavItem[];
}

const TAB_ICONS: Partial<Record<NavSection, LucideIcon>> = { Today: Sunrise, Teach: BookOpen, Assess: ClipboardCheck, Class: Users };
const TAB_SECTIONS: NavSection[] = ['Today', 'Teach', 'Assess', 'Class'];

/** Sectioned (teacher) navs on phones: a tab per daily section, and More for Talk and Me. Null for navs without sections. */
export function phoneSectionLayout(items: NavItem[]): PhoneTab[] | null {
  if (!items.some((item: NavItem) => item.section)) return null;
  const inSection = (s: NavSection) => items.filter((item: NavItem) => item.section === s);
  const tabs: PhoneTab[] = [];
  for (const section of TAB_SECTIONS) {
    const sectionItems = inSection(section);
    if (sectionItems.length === 0) continue;
    const direct = section === 'Today' && sectionItems.length === 1 ? sectionItems[0].href : undefined;
    tabs.push({ key: section, label: section, icon: TAB_ICONS[section] ?? MoreHorizontal, href: direct, items: sectionItems });
  }
  const rest = NAV_SECTIONS.filter((s: NavSection) => !TAB_SECTIONS.includes(s)).flatMap(inSection);
  if (rest.length > 0) tabs.push({ key: 'More', label: 'More', icon: MoreHorizontal, items: rest });
  return tabs;
}
