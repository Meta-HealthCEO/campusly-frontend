'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';

export type AssessmentType = 'test' | 'exam' | 'assignment' | 'practical' | 'project';

export interface StudentTermDetailMark {
  assessmentId: string;
  assessmentName: string;
  date: string;
  term: number;
  type: AssessmentType;
  mark: number;
  total: number;
  percent: number;
  weight: number;
  isAbsent: boolean;
  comment?: string | null;
}

export interface StudentTermDetailSubject {
  subjectId: string;
  subjectName: string;
  // Bucket-weighted average. null when student has no marks OR no
  // weightings are configured (see missingWeighting).
  weightedAverage: number | null;
  missingWeighting: boolean;
  highestPercent: number | null;
  lowestPercent: number | null;
  marks: StudentTermDetailMark[];
}

export interface StudentTermDetail {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  term: number | null;
  scope: 'term' | 'year';
  academicYear: number;
  subjects: StudentTermDetailSubject[];
  overallAverage: number | null;
}

interface Args {
  studentId: string | null;
  // Pass 'year' for full-year aggregate.
  term: number | 'year';
  academicYear: number;
}

export function useStudentTermDetail({ studentId, term, academicYear }: Args) {
  const [detail, setDetail] = useState<StudentTermDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!studentId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string | number> = { academicYear };
      if (term !== 'year') params.term = term;
      const res = await apiClient.get(
        `/academic/students/${studentId}/term-detail`,
        { params },
      );
      setDetail(unwrapResponse<StudentTermDetail>(res));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not load student detail.'));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [studentId, term, academicYear]);

  useEffect(() => { void fetchDetail(); }, [fetchDetail]);

  return { detail, loading };
}
