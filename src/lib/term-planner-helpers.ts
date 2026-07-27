// ============================================================
// Term planner normalisation helpers — pure mapping between the raw
// planner API payloads and the typed planner models. Extracted from
// hooks/useTermPlanner.ts for file-size budget + testability.
// ============================================================

import { resolveField, resolveId } from '@/lib/api-helpers';
import type {
  AssessmentPlan,
  AssessmentPlanType,
  PlannedAssessment,
  SchoolClass,
  Subject,
  WeightingInfo,
} from '@/types';

export interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

export interface PlannerClassOption {
  id: string;
  name: string;
  gradeLevel?: number;
  subjects: SubjectOption[];
}

export interface RawPlannedAssessment {
  title?: string;
  type?: AssessmentPlanType;
  assessmentType?: AssessmentPlanType;
  plannedDate?: string;
  marks?: number;
  totalMarks?: number;
  weight?: number;
  topicIds?: unknown[];
  assessmentId?: string | null;
  linkedPaperId?: string | null;
  status?: PlannedAssessment['status'];
}

export interface RawWeightSummary {
  subjectId?: string;
  subjectName?: string;
  totalWeight?: number;
  totalRequiredWeight?: number;
  assessmentCount?: number;
  byType?: Partial<Record<AssessmentPlanType, number>>;
  requiredByType?: Partial<Record<AssessmentPlanType, number>>;
}

const FORMAL_TYPES: AssessmentPlanType[] = ['test', 'exam', 'practical', 'project'];
const INFORMAL_TYPES: AssessmentPlanType[] = ['assignment'];

export function getClassLabel(classInfo: SchoolClass): string {
  const gradeName =
    resolveField<string>(classInfo.gradeId, 'name') ??
    resolveField<string>(classInfo.grade, 'name') ??
    classInfo.gradeName ??
    '';
  return [gradeName, classInfo.name].filter(Boolean).join(' ') || 'Class';
}

export function getClassGradeLevel(classInfo: SchoolClass): number | undefined {
  return (
    resolveField<number>(classInfo.gradeId, 'level') ??
    resolveField<number>(classInfo.grade, 'level') ??
    undefined
  );
}

export function normalizeSubject(subject: Subject | SubjectOption | null | undefined): SubjectOption | null {
  if (!subject) return null;
  const id = resolveId(subject);
  if (!id) return null;
  return {
    id,
    name: subject.name ?? 'Subject',
    code: subject.code ?? '',
  };
}

export function normalizeAssessment(raw: RawPlannedAssessment): PlannedAssessment {
  const type = raw.type ?? raw.assessmentType ?? 'test';
  return {
    title: raw.title ?? 'Untitled assessment',
    type,
    assessmentType: type,
    plannedDate: raw.plannedDate ? raw.plannedDate.slice(0, 10) : '',
    marks: raw.marks ?? raw.totalMarks ?? 0,
    totalMarks: raw.totalMarks ?? raw.marks ?? 0,
    weight: raw.weight ?? 0,
    topicIds: (raw.topicIds ?? []).map((item) => resolveId(item as never)).filter(Boolean),
    assessmentId: raw.assessmentId ?? raw.linkedPaperId ?? null,
    linkedPaperId: raw.linkedPaperId ?? raw.assessmentId ?? null,
    status: raw.status ?? 'planned',
  };
}

export function normalizePlan(plan: AssessmentPlan | null, selectedSubject: string): AssessmentPlan | null {
  if (!plan) return null;
  return {
    ...plan,
    subjectId: resolveId(plan.subjectId as never) || selectedSubject,
    plannedAssessments: (plan.plannedAssessments ?? []).map((assessment) =>
      normalizeAssessment(assessment as RawPlannedAssessment),
    ),
  };
}

export function sumWeights(types: AssessmentPlanType[], byType?: Partial<Record<AssessmentPlanType, number>>): number {
  return types.reduce((sum, type) => sum + Number(byType?.[type] ?? 0), 0);
}

export function normalizeWeighting(raw: RawWeightSummary, selectedSubject: string): WeightingInfo {
  const byType = raw.byType ?? {};
  const requiredByType = raw.requiredByType ?? {};
  return {
    subjectId: raw.subjectId ?? selectedSubject,
    subjectName: raw.subjectName ?? 'Selected subject',
    requiredFormalWeight: sumWeights(FORMAL_TYPES, requiredByType),
    actualFormalWeight: sumWeights(FORMAL_TYPES, byType),
    requiredInformalWeight: sumWeights(INFORMAL_TYPES, requiredByType),
    actualInformalWeight: sumWeights(INFORMAL_TYPES, byType),
    totalWeight: Number(raw.totalWeight ?? 0),
    totalRequiredWeight: Number(raw.totalRequiredWeight ?? 0),
    assessmentCount: Number(raw.assessmentCount ?? 0),
    byType,
    requiredByType,
  };
}

