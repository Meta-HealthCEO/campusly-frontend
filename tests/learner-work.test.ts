import { describe, expect, it } from 'vitest';
import { mergeLearnerWork } from '../src/lib/learner-work';
import { learnerCopy } from '../src/lib/learner-copy';
import { pendingAnswerLabel } from '../src/lib/homework-grading';
import { readSource } from './support/source';
import type { StudentHomeworkItem } from '../src/hooks/useStudentHomework';
import type { StudentAssignmentItem } from '../src/types/assignments';

const now = new Date('2026-09-25T10:00:00Z');
const hw = (id: string, dueAt: string, status: StudentHomeworkItem['status'], mark?: number): StudentHomeworkItem =>
  ({ id, title: `HW ${id}`, subject: 'Mathematics', type: 'exercise', dueAt, status, mark, totalMarks: 10 });
const project = (id: string, dueAt: string | null, submission: StudentAssignmentItem['submission'] = null): StudentAssignmentItem =>
  ({ _id: id, title: `Project ${id}`, subjectId: { _id: 's', name: 'Physical Sciences' }, totalMarks: 20,
    classAssignment: { _id: 'ca', classId: 'c', releaseAt: null, dueAt, assignedBy: 't', assignedAt: now.toISOString() }, submission } as unknown as StudentAssignmentItem);

describe('mergeLearnerWork (spec §2: projects in Homework)', () => {
  it('puts homework and projects in one list: overdue first, then by due date; done work below, newest first', () => {
    const { todo, done } = mergeLearnerWork(
      [hw('a', '2026-09-30T15:00:00Z', 'pending'), hw('b', '2026-09-20T15:00:00Z', 'overdue'), hw('c', '2026-09-10T15:00:00Z', 'graded', 8)],
      [project('p', '2026-09-27T15:00:00Z'), project('q', '2026-09-01T15:00:00Z', { _id: 'x', status: 'marked', submittedAt: '2026-09-01T10:00:00Z', totalMark: 15 })],
      now,
    );
    expect(todo.map((r) => `${r.kind}:${r.id}:${r.state}`)).toEqual(['homework:b:overdue', 'project:p:todo', 'homework:a:todo']);
    expect(done.map((r) => `${r.id}:${r.markLabel}`)).toEqual(['c:8/10', 'q:15/20']);
    expect(todo[1]).toMatchObject({ href: '/student/assignments/p', subject: 'Physical Sciences' });
    expect(todo[0]?.href).toBe('/student/homework/b');
  });
});

describe('learner wording', () => {
  it('says Lessons and Marks to a standalone teacher\'s learners, and keeps the school words otherwise', () => {
    expect(learnerCopy(true)).toMatchObject({ lessonsTitle: 'Lessons', marksTitle: 'Marks', lessonsEmpty: 'When your teacher releases a lesson, it appears here.' });
    expect(learnerCopy(false)).toMatchObject({ lessonsTitle: 'Courses', marksTitle: 'My Grades' });
    expect(learnerCopy(true)).toMatchObject({ lessonsSection: 'My lessons', lessonFallback: 'Lesson' });
    expect(learnerCopy(false)).toMatchObject({ lessonsSection: 'My units', lessonFallback: 'Unit' });
    expect(readSource('src/app/(dashboard)/student/courses/page.tsx')).not.toMatch(/>My units<|'Unit'/);
  });

  it('says the teacher will mark an answer once AI marking is used up', () => {
    expect(pendingAnswerLabel({ aiMarkCount: 3 })).toBe('Your teacher will mark this');
    expect(pendingAnswerLabel({ aiMarkCount: 1 })).toBe('Marking…');
    expect(pendingAnswerLabel(null)).toBe('Marking…');
  });

  it('sends Back from a project to Homework for standalone learners', () => {
    expect(readSource('src/app/(dashboard)/student/assignments/[id]/page.tsx')).toContain("isStandaloneLearner ? '/student/homework' : '/student/assignments'");
  });
});
