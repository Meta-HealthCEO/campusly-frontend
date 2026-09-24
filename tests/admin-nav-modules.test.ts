import { describe, expect, it } from 'vitest';
import type { NavItem } from '../src/lib/constants';
import { ADMIN_NAV } from '../src/lib/constants';
import { visibleNavItems } from '../src/lib/nav-visibility';

/** Admin pages whose API is mounted behind requireModule(<module>) in the backend's app.ts. */
const GATED: Record<string, string> = {
  '/admin/academics': 'academic',
  '/admin/timetable-builder': 'academic',
  '/admin/attendance': 'attendance',
  '/admin/substitutes': 'attendance',
  '/admin/lost-found': 'lost_found',
  '/admin/aftercare': 'aftercare',
  '/admin/fundraising': 'fundraising',
  '/admin/learning': 'learning',
  '/admin/migration': 'migration',
  '/admin/uniform': 'uniform',
  '/admin/achiever': 'achiever',
  '/admin/reception': 'visitor_management',
  '/admin/settings/communication': 'communication',
  '/admin/settings/communication/templates': 'communication',
};

const flatten = (items: NavItem[]): NavItem[] => items.flatMap((i) => [i, ...(i.children ?? [])]);

describe('admin nav module gates', () => {
  it.each(Object.entries(GATED))('%s is shown only when %s is switched on', (href, module) => {
    const item = flatten(ADMIN_NAV).find((i) => i.href === href && i.module);
    expect(item?.module).toBe(module);
  });

  it('hides Fundraising and Uniform Shop from a school without those modules', () => {
    const on = ['fee', 'academic', 'attendance'];
    const labels = flatten(visibleNavItems(ADMIN_NAV, { isModuleEnabled: (m) => on.includes(m), hasPermission: () => true }))
      .map((i) => i.label);
    expect(labels).not.toContain('Fundraising');
    expect(labels).not.toContain('Uniform Shop');
    expect(labels).toContain('Academics');
  });
});
