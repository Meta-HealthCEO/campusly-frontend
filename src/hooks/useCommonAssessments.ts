import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { CommonAssessmentResult } from '@/types';

export function useCommonAssessments(departmentId: string | null) {
  const [results, setResults] = useState<CommonAssessmentResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCommonAssessments = useCallback(async (
    filters?: { subjectId?: string; term?: number; year?: number },
  ) => {
    if (!departmentId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.subjectId) params.set('subjectId', filters.subjectId);
      if (filters?.term) params.set('term', String(filters.term));
      if (filters?.year) params.set('year', String(filters.year));
      const res = await apiClient.get(
        `/departments/${departmentId}/common-assessments?${params}`,
      );
      const data = unwrapList<CommonAssessmentResult>(res);
      setResults(data);
    } catch (err: unknown) {
      console.error('Failed to load common assessments', err);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  return { results, loading, fetchCommonAssessments };
}
