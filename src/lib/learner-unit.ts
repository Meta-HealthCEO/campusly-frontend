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
