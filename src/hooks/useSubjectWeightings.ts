'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';

export type AssessmentType = 'test' | 'exam' | 'assignment' | 'practical' | 'project';

export const ASSESSMENT_TYPES: readonly AssessmentType[] = [
  'test', 'exam', 'assignment', 'practical', 'project',
] as const;

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  test: 'Tests',
  exam: 'Exams',
  assignment: 'Assignments',
  practical: 'Practicals',
  project: 'Projects',
};

export interface BucketRow {
  assessmentType: AssessmentType;
  weightPercentage: number;
}

export interface TermBuckets {
  term: number;
  buckets: BucketRow[];
  isEmpty: boolean;
}

export interface SubjectWeightingMatrix {
  subjectId: string;
  subjectName: string;
  gradeId: string;
  gradeName: string;
  terms: TermBuckets[];
}

interface Args {
  // Pass null to skip the fetch (e.g. while the dialog is closed).
  subjectId: string | null;
  gradeId: string | null;
}

export function useSubjectWeightings({ subjectId, gradeId }: Args) {
  const [matrix, setMatrix] = useState<SubjectWeightingMatrix | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchMatrix = useCallback(async () => {
    if (!subjectId || !gradeId) {
      setMatrix(null);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get('/academic/subject-weightings/matrix', {
        params: { subjectId, gradeId },
      });
      setMatrix(unwrapResponse<SubjectWeightingMatrix>(res));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not load weightings.'));
      setMatrix(null);
    } finally {
      setLoading(false);
    }
  }, [subjectId, gradeId]);

  useEffect(() => { void fetchMatrix(); }, [fetchMatrix]);

  // Atomic save of one term's buckets. Server enforces sum-to-100 — we
  // pre-validate so the UX feels snappy.
  const saveTerm = useCallback(async (term: number, buckets: BucketRow[]) => {
    if (!subjectId || !gradeId) throw new Error('subjectId/gradeId required');
    const sum = buckets.reduce((s, b) => s + b.weightPercentage, 0);
    if (Math.abs(sum - 100) > 0.1) {
      toast.error(`Weights must sum to 100 (currently ${sum.toFixed(1)})`);
      throw new Error('Sum mismatch');
    }
    setSaving(true);
    try {
      await apiClient.put('/academic/subject-weightings/matrix', {
        subjectId, gradeId, term, buckets,
      });
      toast.success(`Term ${term} weightings saved`);
      await fetchMatrix();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not save weightings.'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [subjectId, gradeId, fetchMatrix]);

  return { matrix, loading, saving, refetch: fetchMatrix, saveTerm };
}
