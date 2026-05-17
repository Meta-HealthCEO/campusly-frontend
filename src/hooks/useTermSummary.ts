'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';

export type AssessmentType = 'test' | 'exam' | 'assignment' | 'practical' | 'project';

export interface TermSummaryAssessment {
  assessmentId: string;
  name: string;
  subjectId: string;
  subjectName: string;
  type: AssessmentType;
  totalMarks: number;
  date: string;
  term: number;
  weight: number;
  classAverage: number | null;
  studentsWithMarks: number;
}

export interface TermSummarySubjectColumn {
  subjectId: string;
  subjectName: string;
  classAverage: number | null;
  studentsWithMarks: number;
  assessmentCount: number;
  // True when no weighting buckets are configured for this subject in any
  // term in scope. Frontend renders a "set weightings" prompt instead of
  // a misleading flat average.
  missingWeighting: boolean;
}

export interface TermSummaryAssessmentMark {
  mark: number;
  total: number;
  percent: number;
  isAbsent: boolean;
}

export interface TermSummaryStudentRow {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  marksByAssessment: Record<string, TermSummaryAssessmentMark>;
  subjectAverages: Record<string, number | null>;
  overallAverage: number | null;
}

export interface TermSummary {
  classId: string;
  className: string;
  gradeId: string;
  term: number | null;
  scope: 'term' | 'year';
  academicYear: number;
  subjects: TermSummarySubjectColumn[];
  assessments: TermSummaryAssessment[];
  students: TermSummaryStudentRow[];
  classOverallAverage: number | null;
}

interface Args {
  classId: string;
  // Pass undefined or 'year' for full-year aggregate.
  term: number | 'year';
  academicYear: number;
  enabled?: boolean;
}

export function useTermSummary({ classId, term, academicYear, enabled = true }: Args) {
  const [summary, setSummary] = useState<TermSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!enabled || !classId) {
      setSummary(null);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string | number> = { classId, academicYear };
      if (term !== 'year') params.term = term;
      const res = await apiClient.get('/academic/term-summary', { params });
      setSummary(unwrapResponse<TermSummary>(res));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not load term summary.'));
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [classId, term, academicYear, enabled]);

  useEffect(() => { void fetchSummary(); }, [fetchSummary]);

  return { summary, loading, refetch: fetchSummary };
}
