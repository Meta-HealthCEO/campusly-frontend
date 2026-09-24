import { describe, expect, it } from 'vitest';
import { NAV_SECTIONS, STANDALONE_TEACHER_NAV, TEACHER_NAV, type NavItem } from '../src/lib/constants';
import { ROUTES } from '../src/lib/routes';
import { isStandaloneTeacherPathAllowed } from '../src/lib/standalone-teacher-paths';

function flatten(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [item, ...flatten(item.children ?? [])]);
}

describe('teacher navigation', () => {
  it.each([
    ['school teachers', TEACHER_NAV],
    ['independent teachers', STANDALONE_TEACHER_NAV],
  ])('gives %s a Marking entry that opens the marking hub', (_who, nav) => {
    const marking = flatten(nav).find((item) => item.label === 'Marking');

    expect(marking?.href).toBe(ROUTES.TEACHER_WORKBENCH_MARKING_HUB);
    expect(marking?.badge).toBe('AI');
  });

  it.each([
    ['school teachers', TEACHER_NAV],
    ['independent teachers', STANDALONE_TEACHER_NAV],
  ])('puts every item %s see into one of the six sections, in order', (_who, nav) => {
    expect(nav.every((item) => item.section && NAV_SECTIONS.includes(item.section))).toBe(true);
    expect(nav.every((item) => !item.children)).toBe(true);
    const order = nav.map((item) => NAV_SECTIONS.indexOf(item.section!));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('files the daily jobs where teachers expect them', () => {
    const sectionOf = (label: string) => TEACHER_NAV.find((i) => i.label === label)?.section;
    expect(sectionOf('Today')).toBe('Today');
    expect(sectionOf('Lessons')).toBe('Teach');
    expect(sectionOf('Marking')).toBe('Assess');
    expect(sectionOf('Gradebook')).toBe('Assess');
    expect(sectionOf('Attendance')).toBe('Class');
    expect(sectionOf('Messages')).toBe('Talk');
    expect(sectionOf('Policies')).toBe('Me');
  });

  it('shows live counts on Marking and Messages', () => {
    expect(TEACHER_NAV.find((i) => i.label === 'Marking')?.countKey).toBe('marking');
    expect(TEACHER_NAV.find((i) => i.label === 'Messages')?.countKey).toBe('messages');
  });

  it('only shows Marking where the marking hub API is enabled', () => {
    const marking = flatten(TEACHER_NAV).find((item) => item.label === 'Marking');

    expect(marking?.module).toBe('teacher_workbench');
  });

  it.each([
    ['Attendance', 'attendance'],
    ['Homework', 'homework'],
    ['Assignments', 'homework'],
    ['Discipline', 'attendance'],
    ['Merits', 'attendance'],
    ['Incidents', 'incident_wellbeing'],
    ['Substitutes', 'attendance'],
  ])('only shows %s where the school has its module (%s)', (label, module) => {
    expect(flatten(TEACHER_NAV).find((item) => item.label === label)?.module).toBe(module);
  });

  it('keeps report cards and report comments inside the gradebook, not the nav', () => {
    const labels = flatten(TEACHER_NAV).map((item) => item.label);
    expect(labels).not.toContain('Reports');
    expect(labels).not.toContain('Report Comments');
  });

  it('shows counsellors Pastoral Care whatever modules the school has (its API is ungated)', () => {
    expect(flatten(TEACHER_NAV).find((item) => item.label === 'Pastoral Care')?.module).toBeUndefined();
  });

  it.each([
    ['Merits', ROUTES.TEACHER_MERITS],
    ['Refer to counsellor', ROUTES.TEACHER_REFERRAL],
    ['Substitutes', ROUTES.TEACHER_SUBSTITUTES],
    ['Policies', ROUTES.TEACHER_POLICIES],
  ])('lets school teachers reach %s from the nav', (label, href) => {
    const item = flatten(TEACHER_NAV).find((navItem) => navItem.label === label);
    expect(href).toMatch(/^\/teacher\//);
    expect(item?.href).toBe(href);
  });

  it('never links an independent teacher to a page the layout would bounce them from', () => {
    const blocked = flatten(STANDALONE_TEACHER_NAV)
      .map((item) => item.href)
      .filter((href) => !isStandaloneTeacherPathAllowed(href));

    expect(blocked).toEqual([]);
  });
});

describe('isStandaloneTeacherPathAllowed', () => {
  it.each([
    '/teacher',
    '/teacher/workbench/marking-hub',
    '/teacher/curriculum/mark-papers',
    '/teacher/attendance',
    '/teacher/papers/abc123',
  ])('allows %s', (path) => {
    expect(isStandaloneTeacherPathAllowed(path)).toBe(true);
  });

  it.each(['/teacher/hod', '/teacher/workbench/planner', '/teacher/attendance-report'])(
    'still blocks school-only pages like %s',
    (path) => {
      expect(isStandaloneTeacherPathAllowed(path)).toBe(false);
    },
  );
});
