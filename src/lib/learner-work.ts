import type { StudentHomeworkItem } from '@/hooks/useStudentHomework';
import type { StudentAssignmentItem } from '@/types/assignments';

export interface WorkRow {
  id: string;
  kind: 'homework' | 'project';
  title: string;
  subject: string;
  dueAt: string | null;
  href: string;
  state: 'todo' | 'overdue' | 'submitted' | 'marked';
  markLabel: string | null;
}

function nameOf(ref: unknown): string {
  return typeof ref === 'object' && ref !== null && 'name' in ref ? String((ref as { name: unknown }).name) : '';
}

function homeworkRow(h: StudentHomeworkItem): WorkRow {
  const state: WorkRow['state'] = h.status === 'graded' ? 'marked' : h.status === 'pending' ? 'todo' : h.status;
  return {
    id: h.id, kind: 'homework', title: h.title, subject: h.subject, dueAt: h.dueAt, href: `/student/homework/${h.id}`, state,
    markLabel: h.status === 'graded' && h.mark != null ? `${h.mark}/${h.totalMarks ?? '?'}` : null,
  };
}

function projectRow(p: StudentAssignmentItem, now: Date): WorkRow {
  const dueAt = p.classAssignment?.dueAt ?? null;
  const sub = p.submission;
  const marked = sub?.status === 'marked' || sub?.status === 'published';
  const state: WorkRow['state'] = marked ? 'marked' : sub ? 'submitted' : dueAt && new Date(dueAt) < now ? 'overdue' : 'todo';
  return {
    id: String(p._id), kind: 'project', title: p.title, subject: nameOf(p.subjectId), dueAt, href: `/student/assignments/${String(p._id)}`, state,
    markLabel: marked && sub?.totalMark != null ? `${sub.totalMark}/${p.totalMarks}` : null,
  };
}

const time = (iso: string | null, empty: number) => (iso ? new Date(iso).getTime() : empty);

/** Homework and projects in one list (spec §2): to do (overdue first, soonest due next), then done (newest first). */
export function mergeLearnerWork(homework: StudentHomeworkItem[], projects: StudentAssignmentItem[], now: Date): { todo: WorkRow[]; done: WorkRow[] } {
  const rows = [...homework.map(homeworkRow), ...projects.map((p: StudentAssignmentItem) => projectRow(p, now))];
  const todo = rows.filter((r: WorkRow) => r.state === 'todo' || r.state === 'overdue')
    .sort((a: WorkRow, b: WorkRow) => Number(b.state === 'overdue') - Number(a.state === 'overdue') || time(a.dueAt, Infinity) - time(b.dueAt, Infinity));
  const done = rows.filter((r: WorkRow) => r.state === 'submitted' || r.state === 'marked')
    .sort((a: WorkRow, b: WorkRow) => time(b.dueAt, -Infinity) - time(a.dueAt, -Infinity));
  return { todo, done };
}
