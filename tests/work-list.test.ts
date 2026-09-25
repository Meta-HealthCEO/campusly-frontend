import { describe, it, expect } from 'vitest';
import { filterWorkRows, homeworkRows, mergeWorkList, workListHref } from '../src/lib/work-list';
import type { Homework } from '../src/types/homework';
import type { Assignment } from '../src/types/assignments';

const hw = (id: string, dueDate: string, extra: Partial<Homework> = {}): Homework => ({
  _id: id, title: `Homework ${id}`, subjectId: 's1', classId: 'c1', schoolId: 'sch', teacherId: 't1',
  dueDate, totalMarks: 10, status: 'assigned', attachments: [], isDeleted: false,
  createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', latePolicy: 'block',
  gradebookAutoPublish: true, version: 1, type: 'exercise', exerciseQuestionIds: [], ...extra,
} as Homework);

const project = (id: string, dues: Array<string | null>, status: Assignment['status'] = 'published'): Assignment => ({
  _id: id, schoolId: 'sch', teacherId: 't1', title: `Project ${id}`, brief: 'Build it', subjectId: 's1', gradeId: 'g1',
  topicIds: [], totalMarks: 20, rubric: [], submissionFormat: 'both', status, latePolicy: 'block',
  gradebookAutoPublish: true, version: 1, isDeleted: false, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
  assignedClasses: dues.map((dueAt, i) => ({
    _id: `p${i}`, classId: i === 0 ? { _id: 'c2', name: 'Grade 4B' } : `c${i + 2}`, releaseAt: null, dueAt, assignedBy: 't1', assignedAt: '2026-09-01T00:00:00Z',
  })),
});

const classNames = new Map([['c1', 'Grade 4A'], ['c3', 'Grade 4C']]);

describe('mergeWorkList', () => {
  it('lists homework and projects together, latest due first', () => {
    const rows = mergeWorkList(
      [hw('h1', '2026-09-10T10:00:00Z'), hw('h2', '2026-09-30T10:00:00Z')],
      [project('a1', ['2026-09-20T10:00:00Z'])],
      classNames,
    );
    expect(rows.map((r) => r.id)).toEqual(['h2', 'a1', 'h1']);
  });

  it('marks projects as projects and opens them on the assignment page', () => {
    const [row] = mergeWorkList([], [project('a1', ['2026-09-20T10:00:00Z', '2026-09-22T10:00:00Z'])], classNames);
    expect(row).toMatchObject({ kind: 'project', typeLabel: 'Project', href: '/teacher/assignments/a1', dueDate: '2026-09-20T10:00:00Z', className: 'Grade 4B, Grade 4C', classIds: ['c2', 'c3'], status: 'assigned' });
  });

  it('opens homework on the homework page with its class name', () => {
    const [row] = mergeWorkList([hw('h1', '2026-09-10T10:00:00Z', { type: 'reading' } as Partial<Homework>)], [], classNames);
    expect(row).toMatchObject({ kind: 'homework', typeLabel: 'Reading', href: '/teacher/homework/h1', className: 'Grade 4A', classIds: ['c1'] });
  });

  it('puts a project not given to a class yet at the top, as a draft', () => {
    const rows = mergeWorkList([hw('h1', '2026-09-10T10:00:00Z')], [project('a1', [], 'draft')], classNames);
    expect(rows[0]).toMatchObject({ id: 'a1', dueDate: null, status: 'draft', className: '' });
  });
});

describe('homeworkRows', () => {
  it('keeps the order homework came in (school teachers see no change)', () => {
    const rows = homeworkRows([hw('h1', '2026-09-10T10:00:00Z'), hw('h2', '2026-09-30T10:00:00Z')], classNames);
    expect(rows.map((r) => r.id)).toEqual(['h1', 'h2']);
  });
});

describe('filterWorkRows', () => {
  const rows = mergeWorkList([hw('h1', '2026-09-10T10:00:00Z')], [project('a1', ['2026-09-20T10:00:00Z'])], classNames);
  it('filters by type, class, status and title', () => {
    expect(filterWorkRows(rows, { search: '', type: 'project', classId: 'all', status: 'all' }).map((r) => r.id)).toEqual(['a1']);
    expect(filterWorkRows(rows, { search: '', type: 'all', classId: 'c2', status: 'all' }).map((r) => r.id)).toEqual(['a1']);
    expect(filterWorkRows(rows, { search: 'homework', type: 'all', classId: 'all', status: 'assigned' }).map((r) => r.id)).toEqual(['h1']);
  });
});

describe('workListHref', () => {
  it('sends standalone teachers back to Homework, school teachers to Assignments', () => {
    expect(workListHref(true)).toBe('/teacher/homework');
    expect(workListHref(false)).toBe('/teacher/assignments');
  });
});
