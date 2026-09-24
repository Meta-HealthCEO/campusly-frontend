import { ROUTES } from '@/lib/routes';
import { toISODate } from '@/lib/utils';
import type { MarkingItem, MarkingItemType } from '@/types';

type ItemRef = Pick<MarkingItem, 'type' | 'id'> & Partial<Pick<MarkingItem, 'href' | 'paperId' | 'classId'>>;

/** Where a marking-queue item opens: the server's link, else the exact paper class or homework. */
export function markingItemHref(item: ItemRef): string {
  if (item.href) return item.href;
  if (item.type === 'paper' && item.paperId) {
    const params = new URLSearchParams({ tab: 'marking' });
    if (item.classId) params.set('classId', item.classId);
    return `/teacher/papers/${item.paperId}?${params.toString()}`;
  }
  if (item.type === 'homework') return `/teacher/homework/${item.id}`;
  return ROUTES.TEACHER_CURRICULUM_MARK_PAPERS;
}

const LABELS: Record<MarkingItemType, string> = {
  homework: 'Homework',
  paper: 'Test paper',
  assessment: 'Assessment',
  ai_grading: 'AI marking',
};

export function markingTypeLabel(type: MarkingItemType): string {
  return LABELS[type];
}

export type DueTone = 'overdue' | 'today' | 'later' | 'none';

/** How a due date reads today, by local calendar day. */
export function dueTone(dueDate: string, now: Date): DueTone {
  if (!dueDate) return 'none';
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return 'none';
  const dueDay = toISODate(due);
  const today = toISODate(now);
  if (dueDay < today) return 'overdue';
  if (dueDay === today) return 'today';
  return 'later';
}
