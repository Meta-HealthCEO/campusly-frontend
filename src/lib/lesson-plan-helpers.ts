import type { LessonPlan } from '@/types';

/**
 * Resolve a populated reference field on a lesson plan.
 * Handles the `string | { _id, ...fields }` shape that Mongo returns
 * depending on whether the field was `populate()`-ed.
 */
export function resolvePopulated(
  val:
    | string
    | {
        _id?: string;
        name?: string;
        title?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        code?: string;
      }
    | null
    | undefined,
  kind: 'name' | 'title' | 'fullName',
): string {
  if (!val || typeof val === 'string') return '';
  if (kind === 'fullName') {
    const parts = [val.firstName, val.lastName].filter(Boolean);
    return parts.join(' ') || '';
  }
  if (kind === 'title') return val.title ?? '';
  return val.name ?? val.code ?? '';
}

export function getLessonPlanSubjectName(plan: LessonPlan): string {
  return resolvePopulated(plan.subjectId, 'name');
}

export function getLessonPlanClassName(plan: LessonPlan): string {
  return resolvePopulated(plan.classId, 'name');
}

export function getLessonPlanTopicName(plan: LessonPlan): string {
  return resolvePopulated(plan.curriculumTopicId, 'title');
}

export function getLessonPlanTeacherName(plan: LessonPlan): string {
  return resolvePopulated(plan.teacherId, 'fullName');
}
