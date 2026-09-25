import type { TeachingScope } from '@/types';

/** What /auth/onboarding-status says about a standalone teacher's setup. */
export interface OnboardingStatus {
  hasScope: boolean;
  hasClass: boolean;
  hasStudent?: boolean;
  hasUnit: boolean;
  dismissed: boolean;
}

export type OnboardingStep = 1 | 2 | 3 | 'done';

/** The first unfinished step: what you teach → first class → first lesson. Skipping step 3 finishes it. */
export function onboardingStep(status: OnboardingStatus): OnboardingStep {
  if (!status.hasScope) return 1;
  if (!status.hasClass) return 2;
  if (!status.hasUnit && !status.dismissed) return 3;
  return 'done';
}

export interface GradePick {
  gradeId: string;
  subjectIds: string[];
}

/** The teaching scope to save; a grade with no subject picked is left out. */
export function scopeFromPicks(picks: readonly GradePick[]): TeachingScope {
  const kept = picks.filter((p: GradePick) => p.subjectIds.length > 0);
  return {
    grades: kept.map((p: GradePick) => p.gradeId),
    subjectsByGrade: kept.map((p: GradePick) => ({ gradeId: p.gradeId, subjectIds: [...p.subjectIds] })),
  };
}

/** A message a teacher can paste into WhatsApp or email so learners can join. */
export function joinMessage(code: string, origin: string): string {
  return `Join my class on Campusly: go to ${origin}/register-student and enter the code ${code}.`;
}

/** The CAPS framework's id: the one named CAPS, else the default one. */
export function capsFrameworkId(frameworks: readonly { id: string; name: string; isDefault?: boolean }[]): string | null {
  const caps = frameworks.find((f) => f.name.trim().toUpperCase() === 'CAPS')
    ?? frameworks.find((f) => f.isDefault)
    ?? frameworks[0];
  return caps?.id ?? null;
}

const PHASE_ORDER = ['foundation', 'intermediate', 'senior', 'fet'];

/** Foundation → Intermediate → Senior → FET; anything else last. */
export function phaseRank(title: string): number {
  const lower = title.toLowerCase();
  const i = PHASE_ORDER.findIndex((p: string) => lower.includes(p));
  return i === -1 ? PHASE_ORDER.length : i;
}

export interface ClassOption {
  key: string;
  capsGradeId: string;
  capsSubjectId: string;
  label: string;
}

/** One possible first class per grade and subject the teacher picked, named "{Grade} {Subject}". */
export function classOptions(scope: TeachingScope, titles: Readonly<Record<string, string>>): ClassOption[] {
  return scope.subjectsByGrade.flatMap((entry) => entry.subjectIds.map((subjectId: string) => ({
    key: `${entry.gradeId}:${subjectId}`,
    capsGradeId: entry.gradeId,
    capsSubjectId: subjectId,
    label: `${titles[entry.gradeId] ?? ''} ${titles[subjectId] ?? ''}`.trim(),
  })));
}

interface LinkedRow {
  id: string;
  curriculumNodeId?: string | null;
}

/** The school Grade and Subject rows that saving the scope made from these CAPS nodes. */
export function schoolPairFor(
  capsGradeId: string,
  capsSubjectId: string,
  grades: readonly LinkedRow[],
  subjects: readonly LinkedRow[],
): { gradeId: string; subjectId: string } | null {
  const grade = grades.find((g: LinkedRow) => g.curriculumNodeId === capsGradeId);
  const subject = subjects.find((s: LinkedRow) => s.curriculumNodeId === capsSubjectId);
  return grade && subject ? { gradeId: grade.id, subjectId: subject.id } : null;
}

/** The lesson builder, opened on the teacher's class and (when known) a CAPS topic. */
export function firstLessonHref(classId: string, topicId: string | null): string {
  const params = new URLSearchParams({ classId });
  if (topicId) params.set('topicId', topicId);
  return `/teacher/courses/new?${params.toString()}`;
}

export interface ChecklistItem {
  done: boolean;
  title: string;
  helper: string;
  href: string;
}

/** Today's "Getting started" card: the same three steps as onboarding. */
export function onboardingChecklist(status: OnboardingStatus): ChecklistItem[] {
  return [
    { done: status.hasScope, title: 'Pick what you teach', helper: 'Your CAPS grades and subjects', href: '/teacher/onboarding' },
    { done: status.hasClass, title: 'Create your first class', helper: 'Learners join it with a code', href: '/teacher/onboarding' },
    { done: status.hasUnit, title: 'Build your first lesson', helper: 'The AI drafts it from CAPS; you check it', href: '/teacher/onboarding' },
  ];
}

const NOT_A_TEACHING_TOPIC = /\b(assessment|revision|exams?|tests?)\b/i;

/** The term's first topic to teach: skips assessment tasks and revision weeks when it can. */
export function firstTeachingTopic<T extends { title: string }>(topics: readonly T[]): T | null {
  return topics.find((t: T) => !NOT_A_TEACHING_TOPIC.test(t.title)) ?? topics[0] ?? null;
}

/** Where to go once "What you teach" is saved: the next unfinished step (a teacher may already have a class). */
export function stepAfterScopeSaved(status: OnboardingStatus): OnboardingStep {
  return onboardingStep({ ...status, hasScope: true });
}

export interface LessonClassCandidate {
  classId: string;
  name: string;
  gradeId: string;
  subjectId: string | null;
}

/** The class to build the first lesson for: the one just made, else the first taught for a subject. */
export function lessonClass<T extends LessonClassCandidate>(classes: readonly T[], preferredClassId: string | null): T | null {
  const withSubject = classes.filter((c: T) => c.subjectId);
  return withSubject.find((c: T) => c.classId === preferredClassId) ?? withSubject[0] ?? null;
}
