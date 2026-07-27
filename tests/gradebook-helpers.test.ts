import { describe, it, expect } from 'vitest';
import {
  validateMarkEntries,
  computeClassStats,
  buildMarkEntries,
  mapStudentHistory,
  type MarkEntry,
} from '../src/lib/gradebook-helpers';

function entry(studentId: string, mark: string): MarkEntry {
  return {
    studentId,
    firstName: 'A',
    lastName: 'B',
    admissionNumber: 'X1',
    mark,
    existingMark: null,
  };
}

describe('validateMarkEntries', () => {
  it('accepts in-range marks and skips empty entries', () => {
    expect(validateMarkEntries([entry('s1', '45'), entry('s2', '')], 50)).toEqual([]);
  });

  it('flags non-numeric marks', () => {
    const errors = validateMarkEntries([entry('s1', 'abc')], 50);
    expect(errors).toEqual([{ studentId: 's1', message: 'Must be a number' }]);
  });

  it('flags negative marks', () => {
    expect(validateMarkEntries([entry('s1', '-3')], 50)[0].message).toBe('Cannot be negative');
  });

  it('flags marks above the assessment total', () => {
    expect(validateMarkEntries([entry('s1', '51')], 50)[0].message).toBe('Exceeds total (50)');
  });
});

describe('computeClassStats', () => {
  it('computes average, extremes, and pass count', () => {
    const stats = computeClassStats(
      [entry('s1', '40'), entry('s2', '20'), entry('s3', '30')],
      50,
    );
    expect(stats).toEqual({
      average: 60, // (80+40+60)/3
      highest: 40,
      lowest: 20,
      passCount: 2, // 80% and 60% pass; 40% fails
      totalWithMarks: 3,
    });
  });

  it('returns null when no marks are captured', () => {
    expect(computeClassStats([entry('s1', '')], 50)).toBeNull();
    expect(computeClassStats([], 50)).toBeNull();
  });
});

describe('buildMarkEntries', () => {
  const students = [
    {
      id: 'st-1',
      classId: 'class-1',
      admissionNumber: 'A001',
      user: { firstName: 'Thandi', lastName: 'Mkhize' },
    },
    {
      id: 'st-2',
      classId: 'class-2',
      admissionNumber: 'A002',
      user: { firstName: 'Other', lastName: 'Class' },
    },
  ];

  it('keeps only students in the selected class', () => {
    const rows = buildMarkEntries(students, {}, 'class-1');
    expect(rows).toHaveLength(1);
    expect(rows[0].studentId).toBe('st-1');
  });

  it('hydrates existing marks as editable strings', () => {
    const rows = buildMarkEntries(students, { 'st-1': 42 }, 'class-1');
    expect(rows[0].mark).toBe('42');
    expect(rows[0].existingMark).toBe(42);
  });

  it('resolves names from populated user objects', () => {
    const rows = buildMarkEntries(students, {}, 'class-1');
    expect(rows[0].firstName).toBe('Thandi');
    expect(rows[0].lastName).toBe('Mkhize');
  });

  it('handles populated classId objects', () => {
    const populated = [{ id: 'st-3', classId: { _id: 'class-9' }, user: {} }];
    expect(buildMarkEntries(populated, {}, 'class-9')).toHaveLength(1);
  });
});

describe('mapStudentHistory', () => {
  it('maps populated refs and computes percentage', () => {
    const rows = mapStudentHistory([
      {
        _id: 'm1',
        assessmentId: { name: 'Term Test' },
        subjectId: { name: 'Maths' },
        mark: 30,
        total: 40,
        createdAt: '2026-03-01',
      },
    ]);
    expect(rows[0]).toEqual({
      id: 'm1',
      assessmentName: 'Term Test',
      subjectName: 'Maths',
      mark: 30,
      total: 40,
      percentage: 75,
      date: '2026-03-01',
    });
  });

  it('guards divide-by-zero totals', () => {
    expect(mapStudentHistory([{ mark: 5, total: 0 }])[0].percentage).toBe(0);
  });
});
