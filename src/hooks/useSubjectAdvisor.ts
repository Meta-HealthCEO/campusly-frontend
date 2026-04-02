'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { SubjectAdvisorResult } from '@/types';

interface UseSubjectAdvisorReturn {
  result: SubjectAdvisorResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSubjectAdvisor(studentId: string): UseSubjectAdvisorReturn {
  const [result, setResult] = useState<SubjectAdvisorResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdvice = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/careers/subject-advisor/student/${studentId}`);
      const data = unwrapResponse<SubjectAdvisorResult>(response);
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load subject advice';
      setError(message);
      console.error('Failed to load subject advice:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchAdvice();
  }, [fetchAdvice]);

  return {
    result,
    loading,
    error,
    refetch: fetchAdvice,
  };
}
