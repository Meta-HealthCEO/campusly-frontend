import { describe, expect, it } from 'vitest';
import { STANDALONE_TEACHER_NAV, TEACHER_NAV, type NavItem } from '../src/lib/constants';
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

  it('only shows Marking where the marking hub API is enabled', () => {
    const marking = flatten(TEACHER_NAV).find((item) => item.label === 'Marking');

    expect(marking?.module).toBe('teacher_workbench');
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
