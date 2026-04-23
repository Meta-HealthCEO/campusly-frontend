import type { Capability } from '@/lib/permissions';
import { can } from '@/lib/permissions';
import type { User } from '@/types';
import type { NavItem } from '@/lib/constants';

/**
 * Nav items that appear for any user who has the given capability,
 * regardless of their base role. Enables a `teacher + isBursar` to
 * see Fees nav even though NAV_BY_ROLE['teacher'] doesn't include it.
 *
 * Phase 3 capability migrations add entries here as they land.
 */
export const NAV_BY_CAPABILITY: Partial<Record<Capability, NavItem[]>> = {
  // Populated incrementally by Phase 3 capability-migration PRs.
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
