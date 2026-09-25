import { describe, it, expect } from 'vitest';
import { lessonWords } from '../src/lib/lesson-words';

describe('lessonWords', () => {
  it('calls Units "lessons" for standalone teachers', () => {
    const w = lessonWords(true);
    expect(w.Many).toBe('Lessons');
    expect(w.One).toBe('Lesson');
    expect(w.one).toBe('lesson');
    expect(w.many).toBe('lessons');
  });

  it('keeps "units" and the Courses page for school teachers', () => {
    const w = lessonWords(false);
    expect(w.Many).toBe('Courses');
    expect(w.One).toBe('Unit');
    expect(w.one).toBe('unit');
    expect(w.many).toBe('units');
  });
});
