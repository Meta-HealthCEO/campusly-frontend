import { describe, it, expect } from 'vitest';
import { composeNav } from '../src/app/(dashboard)/nav-config';
import { TEACHER_NAV } from '../src/lib/nav/teacher-nav';
import { phoneSectionLayout } from '../src/lib/nav-visibility';
import type { NavItem } from '../src/lib/constants';
import type { User } from '../src/types';

function user(overrides: Partial<User>): User {
  return {
    id: 'u1', email: 'a@b.c', firstName: 'A', lastName: 'B', role: 'teacher',
    schoolId: 'school-1', isActive: true, createdAt: '', updatedAt: '', ...overrides,
  } as User;
}

const sheetHrefs = (items: NavItem[]) => (phoneSectionLayout(items) ?? []).flatMap((t) => t.items.map((i) => i.href));

describe('composeNav', () => {
  it('files capability items under Me when the base nav has sections', () => {
    const nav = composeNav(user({ isHOD: true }), TEACHER_NAV);
    const academics = nav.find((i: NavItem) => i.href === '/admin/academics');
    expect(academics?.section).toBe('Me');
    expect(nav.every((i: NavItem) => i.section)).toBe(true);
  });

  it('keeps capability items reachable on a teacher phone', () => {
    const hrefs = sheetHrefs(composeNav(user({ isHOD: true }), TEACHER_NAV));
    expect(hrefs).toContain('/admin/academics');
    expect(hrefs).toContain('/admin/timetable-builder');
  });

  it('leaves unsectioned navs unsectioned', () => {
    const base: NavItem[] = [{ label: 'Home', href: '/x', icon: TEACHER_NAV[0].icon }];
    const nav = composeNav(user({ isHOD: true }), base);
    expect(nav.length).toBeGreaterThan(1);
    expect(nav.some((i: NavItem) => i.section)).toBe(false);
  });
});
