import { describe, it, expect } from 'vitest';
import { copyClassOptions, copyTitleFor, libraryByline, libraryMeta, sameGradeClasses, type LibraryEntry } from '../src/lib/unit-library';

const entry: LibraryEntry = {
  id: 'c1', title: 'Numbers to 99 · Grade 1 Mathematics · Term 3', gradeId: 'g1', gradeName: 'Grade 1', subjectName: 'Mathematics',
  termNumber: 3, authorName: 'Lindiwe Dube', items: 6, minutes: 37, releasedAt: '2026-09-20T08:00:00.000Z', mine: false,
};

describe('sameGradeClasses', () => {
  it('offers only the classes of the unit\'s grade', () => {
    const classes = [{ id: 'a', name: 'Grade 1 - A', gradeId: 'g1' }, { id: 'r', name: 'Grade R - A', gradeId: 'gR' }, { id: 'b', name: 'Grade 1 - B', gradeId: 'g1' }];
    expect(sameGradeClasses(classes, 'g1').map((c) => c.name)).toEqual(['Grade 1 - A', 'Grade 1 - B']);
    expect(sameGradeClasses(classes, null)).toEqual([]);
  });
});

describe('copyTitleFor', () => {
  it('moves the title to the new term, as the server does', () => {
    expect(copyTitleFor(entry.title, 4, 3)).toBe('Numbers to 99 · Grade 1 Mathematics · Term 4');
    expect(copyTitleFor(entry.title, 3, 3)).toBe(entry.title);
    expect(copyTitleFor('Fractions', 2, 1)).toBe('Fractions · Term 2');
  });
});

describe('library wording', () => {
  it('reads like the unit card: grade, subject, term, size, and who made it', () => {
    expect(libraryMeta(entry)).toBe('Grade 1 · Mathematics · Term 3 · 6 items · 37 min');
    expect(libraryByline(entry)).toBe('By Lindiwe Dube');
    expect(libraryByline({ ...entry, mine: true })).toBe('Yours');
    expect(libraryMeta({ ...entry, items: 1, termNumber: null, subjectName: '' })).toBe('Grade 1 · 1 item · 37 min');
  });
});

describe('copyClassOptions', () => {
  it('lists each class once, with its grade (populated or not)', () => {
    const entries = [
      { class: { id: 'a', name: 'Grade 1 - A', gradeId: 'g1' } },
      { class: { id: 'a', name: 'Grade 1 - A', gradeId: 'g1' } },
      { class: { id: 'r', name: 'Grade R - A', gradeId: { id: 'gR', name: 'Grade R' } } },
    ];
    expect(copyClassOptions(entries)).toEqual([{ id: 'a', name: 'Grade 1 - A', gradeId: 'g1' }, { id: 'r', name: 'Grade R - A', gradeId: 'gR' }]);
  });
});
