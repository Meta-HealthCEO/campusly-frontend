import { describe, it, expect } from 'vitest';
import { buildTutorSubjects } from '../src/lib/ai-tutor-subjects';
import type { Subject } from '../src/types';

function catalogueSubject(id: string, name: string): Subject {
  return { id, name, code: '' } as Subject;
}

function classSource(subjectId: string, subjectName: string) {
  return {
    grade: { id: 'grade-1' },
    teacher: { id: 'teacher-1' },
    subject: { id: subjectId, name: subjectName },
  };
}

describe('buildTutorSubjects', () => {
  it('unions class-enrolled subjects with the catalogue', () => {
    const result = buildTutorSubjects(
      [catalogueSubject('cat-1', 'Mathematics')],
      classSource('cls-1', 'Natural Sciences'),
      [],
      '',
    );
    expect(result.map((s) => s.name).sort()).toEqual(['Mathematics', 'Natural Sciences']);
  });

  it('dedupes the same subject appearing in class and catalogue by name', () => {
    const result = buildTutorSubjects(
      [catalogueSubject('cat-1', 'Mathematics')],
      classSource('cls-1', 'Mathematics'),
      [],
      '',
    );
    expect(result).toHaveLength(1);
  });

  it('dedupes name variants case- and whitespace-insensitively', () => {
    const result = buildTutorSubjects(
      [catalogueSubject('cat-1', '  mathematics ')],
      classSource('cls-1', 'Mathematics'),
      [],
      '',
    );
    expect(result).toHaveLength(1);
  });

  it('keeps the selected subject id when identities collide', () => {
    const result = buildTutorSubjects(
      [catalogueSubject('cat-1', 'Mathematics')],
      classSource('cls-1', 'Mathematics'),
      [],
      'cat-1',
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cat-1');
  });

  it('drops catalogue entries without id or name', () => {
    const result = buildTutorSubjects(
      [catalogueSubject('', 'Nameless'), catalogueSubject('id-2', '')],
      null,
      [],
      '',
    );
    expect(result).toEqual([]);
  });

  it('sorts alphabetically by name', () => {
    const result = buildTutorSubjects(
      [catalogueSubject('b', 'Zulu'), catalogueSubject('a', 'Afrikaans')],
      null,
      [],
      '',
    );
    expect(result.map((s) => s.name)).toEqual(['Afrikaans', 'Zulu']);
  });

  it('handles a null homeroom and empty classes gracefully', () => {
    expect(buildTutorSubjects([], null, [], '')).toEqual([]);
  });
});
