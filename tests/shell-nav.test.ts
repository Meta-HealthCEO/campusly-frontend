import { describe, expect, it } from 'vitest';
import { BookOpen } from 'lucide-react';
import { ADMIN_NAV, STANDALONE_TEACHER_NAV, type NavItem } from '../src/lib/constants';
import { isNavItemActive, isSectioned } from '../src/lib/shell/nav-active';

const item = (href: string, extra: Partial<NavItem> = {}): NavItem => ({ label: href, href, icon: BookOpen, ...extra });

describe('isNavItemActive (lifted unchanged from Sidebar)', () => {
  it('matches its own page', () => {
    expect(isNavItemActive('/teacher/homework', item('/teacher/homework'), false)).toBe(true);
  });

  it('in a sectioned nav, highlights the item for pages below it', () => {
    expect(isNavItemActive('/teacher/courses/abc/edit', item('/teacher/courses'), true)).toBe(true);
    expect(isNavItemActive('/teacher/courses/abc/edit', item('/teacher/courses'), false)).toBe(false);
  });

  it('never lets Today (/teacher) claim every teacher page', () => {
    expect(isNavItemActive('/teacher/homework', item('/teacher'), true)).toBe(false);
    expect(isNavItemActive('/teacher', item('/teacher'), true)).toBe(true);
  });

  it('highlights a group while one of its children is open', () => {
    const fees = item('/admin/fees', { children: [item('/admin/fees'), item('/admin/fees/invoices')] });
    expect(isNavItemActive('/admin/fees/invoices/42', fees, false)).toBe(true);
  });

  it('does not match a sibling that only shares a prefix', () => {
    expect(isNavItemActive('/teacher/papers-archive', item('/teacher/papers'), true)).toBe(false);
  });
});

describe('isSectioned', () => {
  it('is true for the teacher navs and false for flat ones', () => {
    expect(isSectioned(STANDALONE_TEACHER_NAV)).toBe(true);
    expect(isSectioned(ADMIN_NAV)).toBe(false);
  });
});
