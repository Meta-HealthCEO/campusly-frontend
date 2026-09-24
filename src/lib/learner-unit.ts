import type { ItemKind, LessonProgressStatus } from '@/types/courses';

/** An item as a learner's enrolment returns it: with its unlock status. */
export interface LearnerItem {
  id: string;
  title: string;
  orderIndex: number;
  itemKind?: ItemKind | null;
  minutes?: number | null;
  type?: string;
  unlockStatus?: LessonProgressStatus;
  /** Extra practice (a revision item): open to do, never required. */
  optional?: boolean;
}

export interface LearnerModule {
  id: string;
  title: string;
  orderIndex: number;
  lessons: LearnerItem[];
}

export interface LearnerUnit {
  id: string;
  title: string;
  modules: LearnerModule[];
}

export const LEARNER_KIND_LABEL: Record<ItemKind, string> = {
  notes: 'Read',
  worked_example: 'Worked example',
  quick_check: 'Quick check',
};

/** A hand-built item (added via the course builder) has `type`, not `itemKind` — it never went through AI generation. */
const LEARNER_TYPE_LABEL: Record<string, string> = {
  content: 'Read',
  chapter: 'Read',
  homework: 'Homework',
  quiz: 'Quiz',
};

/**
 * What a learner sees for an item's kind. AI-generated items carry
 * `itemKind`; hand-built ones only carry `type` — falling back to
 * `itemKind ?? 'notes'` mislabels a hand-built quiz or homework item as
 * "Read".
 */
export function learnerItemLabel(item: Pick<LearnerItem, 'itemKind' | 'type'>): string {
  if (item.itemKind) return LEARNER_KIND_LABEL[item.itemKind];
  return LEARNER_TYPE_LABEL[item.type ?? ''] ?? 'Read';
}

export interface ResumeTarget {
  lessonId: string;
  title: string;
  moduleTitle: string;
  /** "Item 4 of 6" */
  position: string;
  minutes: number | null;
  /** Anything done yet: "Continue" rather than "Start". */
  started: boolean;
}

function ordered(unit: LearnerUnit): Array<{ item: LearnerItem; module: LearnerModule }> {
  return [...unit.modules]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((module) => [...module.lessons].sort((a, b) => a.orderIndex - b.orderIndex).map((item) => ({ item, module })));
}

/** Where the learner picks up: the first required item still to do. Null once the unit is done. */
export function resumeTarget(unit: LearnerUnit): ResumeTarget | null {
  const all = ordered(unit);
  const required = all.filter(({ item }) => !item.optional);
  const index = required.findIndex(({ item }) => item.unlockStatus === 'available' || item.unlockStatus === 'in_progress');
  if (index === -1) return null;
  const { item, module } = required[index];
  const started = item.unlockStatus === 'in_progress' || all.some(({ item: i }) => i.unlockStatus === 'completed');
  return {
    lessonId: item.id,
    title: item.title,
    moduleTitle: module.title,
    position: `Item ${index + 1} of ${required.length}`,
    minutes: item.minutes ?? null,
    started,
  };
}

export function moduleProgress(module: { lessons: LearnerItem[] }): { done: number; total: number; percent: number } {
  const required = module.lessons.filter((l) => !l.optional);
  const total = required.length;
  const done = required.filter((l) => l.unlockStatus === 'completed').length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function unitDone(unit: LearnerUnit): boolean {
  const required = ordered(unit).filter(({ item }) => !item.optional);
  return required.length > 0 && required.every(({ item }) => item.unlockStatus === 'completed');
}

interface EnrolmentLike {
  status: string;
  progressPercent: number;
  enrolledAt: string;
}

/**
 * The unit to resume: the one the learner has actually started but not
 * finished, not just the first (or most recently released) active
 * enrolment — a freshly-released unit shouldn't jump the queue ahead of
 * one they're partway through.
 */
export function currentEnrolment<T extends EnrolmentLike>(enrolments: T[]): T | null {
  const active = enrolments.filter((e) => e.status === 'active');
  const inProgress = active.filter((e) => e.progressPercent > 0);
  const pool = inProgress.length > 0 ? inProgress : active;
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime())[0];
}

/** What the server says when a learner answers a quick check the teacher has since changed. */
const STALE_CHECK_MESSAGE = 'This check changed. Start it again.';

/**
 * The quick check was edited after the learner opened it: the server refuses
 * these answers, and will refuse every resubmit of the same questions, so the
 * player must load the check's current questions.
 */
export function isStaleCheckRefusal(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const response = (err as { response?: { status?: number; data?: { error?: string; message?: string } } }).response;
  return response?.status === 400 && (response.data?.error ?? response.data?.message) === STALE_CHECK_MESSAGE;
}
