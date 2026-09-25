import { describe, expect, it } from 'vitest';
import { ADMIN_NAV, PARENT_NAV, STUDENT_NAV, TEACHER_NAV } from '../src/lib/constants';
import { navContextFor } from '../src/lib/nav-context';

describe('navContextFor', () => {
  it('names the section and page', () => {
    expect(navContextFor('/teacher/grades', TEACHER_NAV)).toEqual({ section: 'Assess', label: 'Gradebook' });
  });

  it('uses the closest nav ancestor for pages below it', () => {
    expect(navContextFor('/teacher/lessons/abc123', TEACHER_NAV)).toEqual({ section: 'Teach', label: 'Lessons' });
  });

  it('prefers the most specific match', () => {
    expect(navContextFor('/teacher/classroom/videos', TEACHER_NAV)).toEqual({ section: 'Teach', label: 'Video library' });
  });

  it('matches Today only on the Today page itself', () => {
    expect(navContextFor('/teacher', TEACHER_NAV)).toEqual({ section: 'Today', label: 'Today' });
    expect(navContextFor('/teacher/settings', TEACHER_NAV)).toBeNull();
  });
});

describe('navContextFor on pages with no nav entry (final review finding 1)', () => {
  it.each([
    ['/admin/payroll', ADMIN_NAV], ['/admin/assets', ADMIN_NAV], ['/admin/governance', ADMIN_NAV], ['/admin/discipline', ADMIN_NAV],
    ['/parent/report-card', PARENT_NAV], ['/parent/child/abc123', PARENT_NAV], ['/student/progress', STUDENT_NAV],
  ] as const)('%s falls back to the role name, never the home entry', (pathname, nav) => {
    expect(navContextFor(pathname, nav)).toBeNull();
  });

  it('a real nested page still resolves to its section entry', () => {
    expect(navContextFor('/admin/students/abc123', ADMIN_NAV)).toMatchObject({ label: 'Students' });
    expect(navContextFor('/parent/fees/invoice-9', PARENT_NAV)).toMatchObject({ label: 'Fees' });
  });

  it('home entries still match themselves', () => {
    expect(navContextFor('/admin', ADMIN_NAV)).toMatchObject({ label: 'Dashboard' });
  });
});
