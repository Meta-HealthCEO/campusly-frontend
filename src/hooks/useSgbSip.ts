import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SchoolImprovementPlan, UpsertSipPayload } from '@/types';

export function useSgbSip(year?: number) {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [sip, setSip] = useState<SchoolImprovementPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSip = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const params: Record<string, string | number> = { schoolId };
      if (year) params.year = year;
      const res = await apiClient.get('/sgb/sip', { params });
      setSip(unwrapResponse<SchoolImprovementPlan>(res));
    } catch (err: unknown) {
      console.error('Failed to load SIP', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, year]);

  useEffect(() => {
    fetchSip();
  }, [fetchSip]);

  return { sip, loading, refetch: fetchSip };
}

export function useSgbSipMutations() {
  const upsertSip = async (payload: UpsertSipPayload): Promise<SchoolImprovementPlan> => {
    const res = await apiClient.put('/sgb/sip', payload);
    return unwrapResponse<SchoolImprovementPlan>(res);
  };

  return { upsertSip };
}
