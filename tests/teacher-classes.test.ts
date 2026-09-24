import { describe, expect, it } from 'vitest';
import { shouldLoadTeacherClasses } from '../src/lib/teacher-classes';

describe('shouldLoadTeacherClasses', () => {
  it('loads while the dialog embedding it is open', () => {
    expect(shouldLoadTeacherClasses(true)).toBe(true);
  });

  it('does not load while the dialog embedding it is closed', () => {
    expect(shouldLoadTeacherClasses(false)).toBe(false);
  });
});
