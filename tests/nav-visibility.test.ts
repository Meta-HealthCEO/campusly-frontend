import { describe, expect, it } from 'vitest';
import { Home, Users, Shield, MessageSquare, BookOpen, Clock } from 'lucide-react';
import type { NavItem } from '../src/lib/constants';
import { phoneNavLayout, visibleNavItems } from '../src/lib/nav-visibility';

const nav: NavItem[] = [
  { label: 'Dashboard', href: '/teacher', icon: Home },
  { label: 'Lessons', href: '/teacher/lessons', icon: BookOpen },
  {
    label: 'Classes', href: '/teacher/classes', icon: Users,
    children: [
      { label: 'My Classes', href: '/teacher/classes', icon: Users },
      { label: 'Students', href: '/teacher/students', icon: Users },
    ],
  },
  { label: 'Timetable', href: '/teacher/timetable', icon: Clock },
  {
    label: 'Communication', href: '/teacher/messages', icon: MessageSquare,
    children: [
      { label: 'Messages', href: '/teacher/messages', icon: MessageSquare },
      { label: 'Announcements', href: '/teacher/communication', icon: MessageSquare, module: 'communication' },
    ],
  },
  {
    label: 'Student Welfare', href: '/teacher/discipline', icon: Shield,
    children: [
      { label: 'Discipline', href: '/teacher/discipline', icon: Shield, module: 'attendance' },
      { label: 'Pastoral Care', href: '/teacher/pastoral', icon: Shield, permission: 'isCounselor' },
    ],
  },
];

describe('visibleNavItems', () => {
  it('hides a nested item whose module is switched off', () => {
    const result = visibleNavItems(nav, { isModuleEnabled: (m) => m !== 'communication', hasPermission: () => true });
    const comms = result.find((i) => i.label === 'Communication');
    expect(comms?.children?.map((c) => c.label)).toEqual(['Messages']);
  });

  it('drops a whole group when none of its items are visible', () => {
    const result = visibleNavItems(nav, { isModuleEnabled: (m) => m !== 'attendance', hasPermission: () => false });
    expect(result.map((i) => i.label)).not.toContain('Student Welfare');
  });

  it('leaves the original nav untouched', () => {
    visibleNavItems(nav, { isModuleEnabled: () => false, hasPermission: () => false });
    expect(nav[4].children).toHaveLength(2);
  });
});

describe('phoneNavLayout', () => {
  it('uses the first four items as tabs', () => {
    expect(phoneNavLayout(nav).primary.map((i) => i.label)).toEqual(['Dashboard', 'Lessons', 'Classes', 'Timetable']);
  });

  it('puts nested items in the More sheet so they can be reached on a phone', () => {
    const sheet = phoneNavLayout(nav).sheet.map((i) => i.label);
    expect(sheet).toEqual(['Students', 'Messages', 'Announcements', 'Discipline', 'Pastoral Care']);
  });

  it('never repeats a link that is already a tab', () => {
    const { sheet } = phoneNavLayout(nav);
    expect(sheet.map((i) => i.href)).not.toContain('/teacher/classes');
    expect(new Set(sheet.map((i) => i.href)).size).toBe(sheet.length);
  });
});
