import { describe, expect, it } from 'vitest';
import { gradeFromApi } from '../src/lib/student-grades';

/** GET /academic/marks/student/:id as the backend sends it (after the client's _id → id), e.g. a marked homework. */
const apiMark = {
  _id: 'm1', id: 'm1', studentId: 'st1', mark: 1, percentage: 100, total: 1, isAbsent: false,
  assessmentId: {
    _id: 'a1', id: 'a1', name: 'Exercise homework', type: 'assignment', totalMarks: 1, term: 3,
    subjectId: { _id: 'sub1', id: 'sub1', name: 'Mathematics', code: 'MATHEMATICS' },
    classId: { _id: 'c1', id: 'c1', name: 'Grade 4 Mathematics' },
  },
};

describe('gradeFromApi (the Marks page)', () => {
  it('reads the populated assessment, its subject id and the mark the backend sends', () => {
    const grade = gradeFromApi(apiMark);
    expect(grade.assessment.subjectId).toBe('sub1');
    expect(grade.assessment.name).toBe('Exercise homework');
    expect(grade.assessment.totalMarks).toBe(1);
    expect([grade.id, grade.assessmentId, grade.marks, grade.percentage]).toEqual(['m1', 'a1', 1, 100]);
  });

  it('keeps a row whose assessment is missing instead of crashing the page', () => {
    const grade = gradeFromApi({ _id: 'm2', id: 'm2', mark: 3, percentage: 60, assessmentId: null });
    expect(grade.assessment.subjectId).toBe('');
    expect(grade.marks).toBe(3);
  });
});
