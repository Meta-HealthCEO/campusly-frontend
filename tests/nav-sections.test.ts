import { describe, expect, it } from 'vitest';
import { Home, BookOpen, Users } from 'lucide-react';
import type { NavItem } from '../src/lib/constants';
import { groupNavBySection } from '../src/lib/nav-sections';

describe('groupNavBySection', () => {
  it('groups consecutive items under their section', () => {
    const nav: NavItem[] = [
      { section: 'Today', label: 'Today', href: '/teacher', icon: Home },
      { section: 'Teach', label: 'Lessons', href: '/teacher/lessons', icon: BookOpen },
      { section: 'Teach', label: 'Library', href: '/teacher/curriculum/content', icon: BookOpen },
      { section: 'Class', label: 'My Classes', href: '/teacher/classes', icon: Users },
    ];
    expect(groupNavBySection(nav).map((g) => [g.section, g.items.length])).toEqual([['Today', 1], ['Teach', 2], ['Class', 1]]);
  });

  it('leaves a nav without sections as one unlabelled group (other portals)', () => {
    const nav: NavItem[] = [{ label: 'Dashboard', href: '/admin', icon: Home }, { label: 'Staff', href: '/admin/staff', icon: Users }];
    expect(groupNavBySection(nav)).toEqual([{ section: null, items: nav }]);
  });

  it('never produces an empty section', () => {
    expect(groupNavBySection([])).toEqual([]);
  });
});
