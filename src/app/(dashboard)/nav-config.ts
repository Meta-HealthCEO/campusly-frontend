import type { Capability } from '@/lib/permissions';
import { can } from '@/lib/permissions';
import type { User } from '@/types';
import type { NavItem } from '@/lib/constants';
import { Settings, GraduationCap, Users, BookMarked, DoorOpen, ScrollText, DollarSign } from 'lucide-react';

/**
 * Nav items that appear for any user who has the given capability,
 * regardless of their base role. Enables a `teacher + isBursar` to
 * see Fees nav even though NAV_BY_ROLE['teacher'] doesn't include it.
 *
 * Phase 3 capability migrations add entries here as they land.
 */
export const NAV_BY_CAPABILITY: Partial<Record<Capability, NavItem[]>> = {
  manage_fees: [
    { label: 'Fees', href: '/admin/fees', icon: DollarSign },
  ],
  manage_school_settings: [
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ],
  manage_users: [
    { label: 'Students', href: '/admin/students', icon: GraduationCap },
    { label: 'Staff', href: '/admin/staff', icon: Users },
  ],
  manage_library: [
    { label: 'Library', href: '/admin/library', icon: BookMarked },
  ],
  manage_visitors: [
    { label: 'Visitor Management', href: '/admin/reception', icon: DoorOpen },
  ],
  view_audit_log: [
    { label: 'Audit Log', href: '/admin/audit', icon: ScrollText },
  ],
};

function dedupeByHref(items: NavItem[]): NavItem[] {
  const seen = new Set<string>();
  const result: NavItem[] = [];
  for (const item of items) {
    if (seen.has(item.href)) continue;
    seen.add(item.href);
    result.push(item);
  }
  return result;
}

export function composeNav(user: User, baseline: NavItem[]): NavItem[] {
  const capabilityItems = (Object.keys(NAV_BY_CAPABILITY) as Capability[])
    .filter((cap) => can(user, cap))
    .flatMap((cap) => NAV_BY_CAPABILITY[cap] ?? []);
  return dedupeByHref([...baseline, ...capabilityItems]);
}
