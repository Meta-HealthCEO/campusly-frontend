import { describe, expect, it } from 'vitest';
import { childClassLine, studentFromParentRecord } from '../src/lib/parent-children';
import type { Student } from '../src/types';

describe('studentFromParentRecord', () => {
  it("puts the child's name where the dashboard reads it when userId comes back filled in", () => {
    const raw = { _id: 's1', userId: { _id: 'u1', firstName: 'Jan', lastName: 'Botha' } } as unknown as Student & { _id: string };
    const s = studentFromParentRecord(raw);
    expect(s.id).toBe('s1');
    expect(s.user?.firstName).toBe('Jan');
    expect(s.userId).toBe('u1');
  });

  it('keeps a user that is already there', () => {
    const raw = { id: 's2', userId: 'u2', user: { firstName: 'Anika', lastName: 'Botha' } } as unknown as Student;
    expect(studentFromParentRecord(raw).user?.firstName).toBe('Anika');
  });

  it("carries the class and grade names the API sends", () => {
    const raw = { _id: 's3', userId: 'u3', className: '1A', gradeName: 'Grade 1' } as unknown as Student & { _id: string };
    const s = studentFromParentRecord(raw);
    expect(s.class?.name).toBe('1A');
    expect(s.grade?.name).toBe('Grade 1');
  });
});

describe('childClassLine', () => {
  it("shows the class alone when its name already says the grade", () => {
    expect(childClassLine('Grade 1', 'Grade 1 - A')).toBe('Grade 1 - A');
  });
  it('joins grade and class otherwise, and copes with either missing', () => {
    expect(childClassLine('Grade 1', '1A')).toBe('Grade 1 · 1A');
    expect(childClassLine('', '1A')).toBe('1A');
    expect(childClassLine('Grade 1', '')).toBe('Grade 1');
    expect(childClassLine('', '')).toBe('');
  });
});

