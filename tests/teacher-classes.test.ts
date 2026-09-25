import { describe, expect, it } from 'vitest';
import { classesPageCopy, shouldLoadTeacherClasses } from '../src/lib/teacher-classes';
import { STANDALONE_TEACHER_NAV } from '../src/lib/constants';

describe('shouldLoadTeacherClasses', () => {
  it('loads while the dialog embedding it is open', () => {
    expect(shouldLoadTeacherClasses(true)).toBe(true);
  });

  it('does not load while the dialog embedding it is closed', () => {
    expect(shouldLoadTeacherClasses(false)).toBe(false);
  });
});

describe('classesPageCopy', () => {
  it('names the page as the standalone nav does, and only what a standalone teacher can use', () => {
    const copy = classesPageCopy(true, 'x');
    const navLabel = STANDALONE_TEACHER_NAV.find((i) => i.href === '/teacher/classes')?.label;
    expect(copy.title).toBe(navLabel);
    expect(copy.description).not.toMatch(/lesson plan|resource/i);
    expect(copy.description).toMatch(/join/i);
  });

  it('keeps school teachers\' title and description', () => {
    expect(classesPageCopy(false, 'Manage your classes and student rosters')).toEqual({ title: 'My Classes', description: 'Manage your classes and student rosters' });
  });
});
