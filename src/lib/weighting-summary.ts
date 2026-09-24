import { resolveId } from '@/lib/api-helpers';
import { ASSESSMENT_TYPE_LABELS, ASSESSMENT_TYPES, type TermBuckets } from '@/hooks/useSubjectWeightings';

export interface WeightingLine {
  term: number;
  set: boolean;
  text: string;
}

/** Terms 1–4 in words, e.g. "Tests 50 · Assignments 30 · Projects 20", or "Not set". */
export function weightingLines(terms: TermBuckets[]): WeightingLine[] {
  return [1, 2, 3, 4].map((n: number): WeightingLine => {
    const buckets = terms.find((t: TermBuckets) => t.term === n)?.buckets ?? [];
    const parts = ASSESSMENT_TYPES.flatMap((type) => {
      const weight = buckets.find((b) => b.assessmentType === type)?.weightPercentage ?? 0;
      return weight > 0 ? [`${ASSESSMENT_TYPE_LABELS[type]} ${weight}`] : [];
    });
    return parts.length > 0 ? { term: n, set: true, text: parts.join(' · ') } : { term: n, set: false, text: 'Not set' };
  });
}

/**
 * The chip for a subject's current-term weighting row. A fetch failure
 * always reads as "Couldn't load" — distinct from "Not set", which means
 * the fetch succeeded and no weighting was ever configured. Without this
 * distinction a network error looks identical to "nobody has set this up
 * yet" and a teacher has no way to tell the two apart.
 */
export function weightingChip(
  current: WeightingLine | undefined,
  failedToLoad: boolean,
): { status: 'absent' | 'due'; label: string } | null {
  if (failedToLoad) return { status: 'absent', label: "Couldn't load" };
  if (current && !current.set) return { status: 'due', label: 'Not set' };
  return null;
}

type GradeRef = string | { id?: string; _id?: string };

/** The subjects taught in a class's grade; every subject when none list that grade. The API populates gradeIds. */
export function classSubjects<S extends { id: string; gradeIds?: readonly GradeRef[] }>(subjects: S[], gradeId: string | null): S[] {
  if (!gradeId) return subjects;
  const inGrade = subjects.filter((s: S) => s.gradeIds?.some((g: GradeRef) => resolveId(g) === gradeId));
  return inGrade.length > 0 ? inGrade : subjects;
}
