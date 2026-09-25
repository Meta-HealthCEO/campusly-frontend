import { describe, expect, it } from 'vitest';
import { classSubjectEditHref, classesPageCopy, entryToEdit, shouldLoadTeacherClasses } from '../src/lib/teacher-classes';
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

describe('classSubjectEditHref', () => {
  it('opens My classes on that class edit dialog', () => {
    expect(classSubjectEditHref('abc123')).toBe('/teacher/classes?edit=abc123');
  });

  it('is an allow-listed standalone page', () => {
    expect(classSubjectEditHref('x').split('?')[0]).toBe('/teacher/classes');
    expect(STANDALONE_TEACHER_NAV.some((i) => i.href === '/teacher/classes')).toBe(true);
  });
});

describe('entryToEdit', () => {
  const entries = [
    { class: { id: 'c1', name: 'Grade 10 Class' } },
    { class: { _id: 'c2', name: 'Grade 11 Class' } },
  ];

  it('finds the class named in the link', () => {
    expect(entryToEdit(entries, 'c2')?.class).toEqual({ _id: 'c2', name: 'Grade 11 Class' });
  });

  it('opens nothing when the link names no class or a class that is not theirs', () => {
    expect(entryToEdit(entries, null)).toBeNull();
    expect(entryToEdit(entries, '')).toBeNull();
    expect(entryToEdit(entries, 'someone-elses')).toBeNull();
  });
});
