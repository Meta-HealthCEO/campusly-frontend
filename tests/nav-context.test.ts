import { describe, expect, it } from 'vitest';
import { TEACHER_NAV } from '../src/lib/constants';
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
