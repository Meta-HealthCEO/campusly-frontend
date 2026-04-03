import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { EnrollmentSummary } from '@/types';

export function useSgbEnrollment(year?: number) {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [summary, setSummary] = useState<EnrollmentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const params: Record<string, string | number> = { schoolId };
      if (year) params.year = year;
      const res = await apiClient.get('/sgb/enrollment/summary', { params });
      setSummary(unwrapResponse<EnrollmentSummary>(res));
    } catch (err: unknown) {
      console.error('Failed to load enrollment summary', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, year]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, refetch: fetchSummary };
}
