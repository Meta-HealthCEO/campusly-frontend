import { describe, expect, it } from 'vitest';
import {
  buildTeachingScope,
  compareGradeNodes,
  filterChildrenToScope,
} from '../src/lib/teaching-scope';
import type { CurriculumNodeItem } from '../src/types';

function node(id: string, type: string, title: string, parentId: string | null = null) {
  return { id, type, title, code: '', parentId, order: 0 } as unknown as CurriculumNodeItem;
}

const g10 = node('g10', 'grade', 'Grade 10');
const g11 = node('g11', 'grade', 'Grade 11');
const g12 = node('g12', 'grade', 'Grade 12');
const subjectsByGradeId: Record<string, CurriculumNodeItem[]> = {
  g10: [
    node('m10', 'subject', 'Mathematics', 'g10'),
    node('ml10', 'subject', 'Mathematical Literacy', 'g10'),
    node('ps10', 'subject', 'Physical Sciences', 'g10'),
  ],
  g11: [
    node('m11', 'subject', 'Mathematics', 'g11'),
    node('ps11', 'subject', 'Physical Sciences', 'g11'),
  ],
};

describe('buildTeachingScope (onboarding names → CAPS nodes)', () => {
  it('maps the grades and subjects a teacher picked onto curriculum nodes', () => {
    const scope = buildTeachingScope(
      ['Grade 10', 'Grade 11'],
      ['Mathematics', 'Physical Sciences'],
      [g10, g11, g12],
      subjectsByGradeId,
    );

    expect(scope).toEqual({
      grades: ['g10', 'g11'],
      subjectsByGrade: [
        { gradeId: 'g10', subjectIds: ['m10', 'ps10'] },
        { gradeId: 'g11', subjectIds: ['m11', 'ps11'] },
      ],
    });
  });

  it('matches names exactly (case-insensitive), so Mathematics is not Mathematical Literacy', () => {
    const scope = buildTeachingScope(['grade 10'], ['mathematics'], [g10], subjectsByGradeId);

    expect(scope.subjectsByGrade).toEqual([{ gradeId: 'g10', subjectIds: ['m10'] }]);
  });

  it('skips grades the curriculum does not have', () => {
    const scope = buildTeachingScope(['Grade 10', 'Grade 13'], ['Mathematics'], [g10], subjectsByGradeId);

    expect(scope.grades).toEqual(['g10']);
  });
});

describe('filterChildrenToScope (topic tree)', () => {
  const scope = {
    grades: ['g10'],
    subjectsByGrade: [{ gradeId: 'g10', subjectIds: ['m10'] }],
  };

  it('shows only the teacher’s subjects under a scoped grade', () => {
    expect(filterChildrenToScope('g10', subjectsByGradeId.g10, scope).map((n) => n.id)).toEqual(['m10']);
  });

  it('leaves every other level untouched', () => {
    const terms = [node('t1', 'term', 'Term 1', 'm10'), node('t2', 'term', 'Term 2', 'm10')];

    expect(filterChildrenToScope('m10', terms, scope)).toEqual(terms);
  });

  it('falls back to every subject when the saved ones no longer exist (stale scope)', () => {
    const stale = { grades: ['g10'], subjectsByGrade: [{ gradeId: 'g10', subjectIds: ['gone'] }] };

    expect(filterChildrenToScope('g10', subjectsByGradeId.g10, stale)).toEqual(subjectsByGradeId.g10);
  });

  it('shows all subjects for a grade the teacher picked without subjects', () => {
    const gradeOnly = { grades: ['g11'], subjectsByGrade: [{ gradeId: 'g11', subjectIds: [] }] };

    expect(filterChildrenToScope('g11', subjectsByGradeId.g11, gradeOnly)).toEqual(subjectsByGradeId.g11);
  });
});

describe('compareGradeNodes', () => {
  it('sorts Grade R first, then by number rather than alphabetically', () => {
    const grades = ['Grade 10', 'Grade 2', 'Grade R', 'Grade 1', 'Grade 12'].map((t, i) =>
      node(`n${i}`, 'grade', t),
    );

    expect([...grades].sort(compareGradeNodes).map((n) => n.title)).toEqual([
      'Grade R', 'Grade 1', 'Grade 2', 'Grade 10', 'Grade 12',
    ]);
  });
});
