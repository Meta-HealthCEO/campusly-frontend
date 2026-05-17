'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';

export interface SubjectTrendAssessment {
  assessmentId: string;
  name: string;
  totalMarks: number;
  weight: number;
  date: string;
  term: number;
  classAverage: number | null;
  studentsWithMarks: number;
}

export interface SubjectTrendTerm {
  term: number;
  classAverage: number | null;
  assessmentCount: number;
  markCount: number;
}

export interface SubjectTrend {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  academicYear: number;
  terms: SubjectTrendTerm[];
  assessments: SubjectTrendAssessment[];
}

interface Args {
  classId: string;
  subjectId: string;
  academicYear: number;
  enabled?: boolean;
}

export function useSubjectTrend({ classId, subjectId, academicYear, enabled = true }: Args) {
  const [trend, setTrend] = useState<SubjectTrend | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTrend = useCallback(async () => {
    if (!enabled || !classId || !subjectId) {
      setTrend(null);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get('/academic/subject-trend', {
        params: { classId, subjectId, academicYear },
      });
      setTrend(unwrapResponse<SubjectTrend>(res));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not load subject trend.'));
      setTrend(null);
    } finally {
      setLoading(false);
    }
  }, [classId, subjectId, academicYear, enabled]);

  useEffect(() => { void fetchTrend(); }, [fetchTrend]);

  return { trend, loading, refetch: fetchTrend };
}
