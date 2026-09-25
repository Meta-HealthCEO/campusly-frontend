import type { Homework } from '@/types/homework';
import type { Assignment } from '@/types/assignments';

/**
 * The Homework list: homework and, for standalone teachers, projects (the
 * assignment brief + rubric flow) in one list.
 */
export type WorkType = Homework['type'] | 'project';
export type WorkStatus = 'assigned' | 'closed' | 'draft';

export interface WorkRow {
  id: string;
  kind: 'homework' | 'project';
  type: WorkType;
  typeLabel: string;
  title: string;
  classIds: string[];
  className: string;
  /** The first due date across the classes it was given to; null before it's given to one. */
  dueDate: string | null;
  status: WorkStatus;
  href: string;
}

export interface WorkListFilters {
  search: string;
  type: 'all' | WorkType;
  classId: string;
  status: 'all' | WorkStatus;
}

const TYPE_LABEL: Record<WorkType, string> = { quiz: 'Quiz', reading: 'Reading', exercise: 'Exercise', project: 'Project' };
const PROJECT_STATUS: Record<Assignment['status'], WorkStatus> = { draft: 'draft', published: 'assigned', archived: 'closed' };

export function homeworkRows(homework: Homework[], classNames: Map<string, string>): WorkRow[] {
  return homework.map((hw: Homework) => ({
    id: hw._id,
    kind: 'homework',
    type: hw.type,
    typeLabel: TYPE_LABEL[hw.type],
    title: hw.title,
    classIds: [hw.classId],
    className: classNames.get(hw.classId) ?? '',
    dueDate: hw.dueDate,
    status: hw.status,
    href: `/teacher/homework/${hw._id}`,
  }));
}

function projectRow(a: Assignment, classNames: Map<string, string>): WorkRow {
  const classes = a.assignedClasses.map((push) =>
    typeof push.classId === 'string'
      ? { id: push.classId, name: classNames.get(push.classId) ?? '' }
      : { id: push.classId._id, name: push.classId.name },
  );
  const dues = a.assignedClasses.map((push) => push.dueAt).filter((d): d is string => !!d).sort();
  return {
    id: a._id,
    kind: 'project',
    type: 'project',
    typeLabel: TYPE_LABEL.project,
    title: a.title,
    classIds: classes.map((c) => c.id),
    className: classes.map((c) => c.name).filter(Boolean).join(', '),
    dueDate: dues[0] ?? null,
    status: PROJECT_STATUS[a.status],
    href: `/teacher/assignments/${a._id}`,
  };
}

/** Homework and projects, latest due first; projects not yet given to a class come first. */
export function mergeWorkList(homework: Homework[], assignments: Assignment[], classNames: Map<string, string> = new Map()): WorkRow[] {
  const rows = [...homeworkRows(homework, classNames), ...assignments.map((a: Assignment) => projectRow(a, classNames))];
  const time = (r: WorkRow): number => (r.dueDate ? new Date(r.dueDate).getTime() : Number.POSITIVE_INFINITY);
  return rows.sort((a: WorkRow, b: WorkRow) => (time(a) === time(b) ? 0 : time(a) < time(b) ? 1 : -1));
}

export function filterWorkRows(rows: WorkRow[], f: WorkListFilters): WorkRow[] {
  const search = f.search.trim().toLowerCase();
  return rows.filter((r: WorkRow) =>
    (!search || r.title.toLowerCase().includes(search))
    && (f.type === 'all' || r.type === f.type)
    && (f.classId === 'all' || r.classIds.includes(f.classId))
    && (f.status === 'all' || r.status === f.status),
  );
}

/** Where the project pages go back to: Homework for standalone teachers (no Assignments page), Assignments otherwise. */
export function workListHref(isStandalone: boolean): string {
  return isStandalone ? '/teacher/homework' : '/teacher/assignments';
}
