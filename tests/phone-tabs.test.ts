import { describe, expect, it } from 'vitest';
import { BookOpen } from 'lucide-react';
import { ADMIN_NAV, PARENT_NAV, STANDALONE_TEACHER_NAV, STUDENT_NAV, TEACHER_NAV, type NavItem } from '../src/lib/constants';
import { isTabActive, phoneTabs } from '../src/lib/shell/phone-tabs';
import { STANDALONE_STUDENT_NAV } from '../src/lib/nav/student-nav';

const item = (href: string): NavItem => ({ label: href, href, icon: BookOpen });

describe('phoneTabs (spec §3, ruling R10)', () => {
  it('gives the standalone teacher Today, Teach, Assess, Class and More', () => {
    const tabs = phoneTabs(STANDALONE_TEACHER_NAV);
    expect(tabs.map((t) => t.label)).toEqual(['Today', 'Teach', 'Assess', 'Class', 'More']);
    expect(tabs[0].href).toBe('/teacher');
    expect(tabs[1].href).toBeUndefined();
    expect(tabs[4].items.map((i) => i.label)).toEqual(['Billing', 'Settings']);
  });

  it('gives a flat nav its first four items and More with the rest', () => {
    const tabs = phoneTabs(['a', 'b', 'c', 'd', 'e', 'f'].map((x) => item(`/p/${x}`)));
    expect(tabs.map((t) => t.label)).toEqual(['/p/a', '/p/b', '/p/c', '/p/d', 'More']);
    expect(tabs[4].items.map((i) => i.href)).toEqual(['/p/e', '/p/f']);
  });

  it('has no More tab when everything fits', () => {
    expect(phoneTabs(['a', 'b', 'c'].map((x) => item(`/p/${x}`))).map((t) => t.label)).toEqual(['/p/a', '/p/b', '/p/c']);
  });

  it.each([['admin', ADMIN_NAV], ['parent', PARENT_NAV], ['learner', STUDENT_NAV], ['teacher', TEACHER_NAV], ['standalone teacher', STANDALONE_TEACHER_NAV], ['standalone learner', STANDALONE_STUDENT_NAV]] as const)(
    '%s: every link stays reachable on a phone', (_role, nav) => {
      const tabs = phoneTabs([...nav]);
      const reachable = new Set(tabs.flatMap((t) => [t.href, ...t.items.map((i) => i.href)]).filter(Boolean));
      const links = nav.flatMap((i: NavItem) => (i.children?.length ? i.children : [i])).map((i: NavItem) => i.href);
      expect(links.filter((href: string) => !reachable.has(href))).toEqual([]);
    },
  );
});

describe('isTabActive', () => {
  const tabs = phoneTabs(STANDALONE_TEACHER_NAV);

  it('lights Today only on /teacher itself', () => {
    expect(isTabActive('/teacher', tabs[0])).toBe(true);
    expect(isTabActive('/teacher/homework', tabs[0])).toBe(false);
  });

  it('lights a section tab for any page under one of its items', () => {
    expect(isTabActive('/teacher/homework/new', tabs[2])).toBe(true);
  });

  it('does not light a one-segment flat tab for every page below it', () => {
    const [home] = phoneTabs([item('/admin'), item('/admin/fees')]);
    expect(isTabActive('/admin/fees', home)).toBe(false);
  });
});
