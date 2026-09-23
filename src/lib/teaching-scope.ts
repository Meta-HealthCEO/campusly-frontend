import { displayNodeTitle } from './curriculum-display';
import type { CurriculumNodeItem, TeachingScope } from '@/types';

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Onboarding records grades/subjects by name ("Grade 10", "Mathematics");
 * the teaching scope that drives the curriculum pickers stores CAPS node ids.
 * Match names exactly (case-insensitive) — "Mathematics" must not pick up
 * "Mathematical Literacy". Names the curriculum doesn't have are skipped.
 */
export function buildTeachingScope(
  gradeNames: readonly string[],
  subjectNames: readonly string[],
  gradeNodes: readonly CurriculumNodeItem[],
  subjectsByGradeId: Readonly<Record<string, readonly CurriculumNodeItem[]>>,
): TeachingScope {
  const grades = gradeNames
    .map((name) => gradeNodes.find((g) => sameName(displayNodeTitle(g), name)))
    .filter((g): g is CurriculumNodeItem => Boolean(g));

  return {
    grades: grades.map((g) => g.id),
    subjectsByGrade: grades.map((grade) => ({
      gradeId: grade.id,
      subjectIds: (subjectsByGradeId[grade.id] ?? [])
        .filter((s) => subjectNames.some((name) => sameName(displayNodeTitle(s), name)))
        .map((s) => s.id),
    })),
  };
}

/**
 * Under a scoped grade, keep only the teacher's subjects. A grade saved with
 * no subjects means "all subjects"; every other level passes through. If the
 * saved subjects no longer match anything (stale scope), show them all rather
 * than an empty grade that looks like it has no curriculum.
 */
export function filterChildrenToScope(
  parentId: string,
  children: CurriculumNodeItem[],
  scope: TeachingScope,
): CurriculumNodeItem[] {
  const entry = scope.subjectsByGrade.find((s) => s.gradeId === parentId);
  if (!entry || entry.subjectIds.length === 0) return children;
  const scoped = children.filter((child) => entry.subjectIds.includes(child.id));
  return scoped.length > 0 ? scoped : children;
}

function gradeRank(node: CurriculumNodeItem): number {
  const title = displayNodeTitle(node);
  if (/\bgrade\s*r\b/i.test(title)) return 0;
  const match = title.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

/** Grade R, Grade 1, Grade 2 … Grade 12 — not "Grade 1, Grade 10, Grade 2". */
export function compareGradeNodes(a: CurriculumNodeItem, b: CurriculumNodeItem): number {
  return gradeRank(a) - gradeRank(b);
}
