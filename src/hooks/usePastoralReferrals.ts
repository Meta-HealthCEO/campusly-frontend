import { useCallback, useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/api-helpers';
import type {
  PastoralReferral,
  CreateReferralPayload,
  ResolveReferralPayload,
  ReferralFilters,
} from '@/types/pastoral';

export function usePastoralReferrals(initialFilters?: ReferralFilters) {
  const [referrals, setReferrals] = useState<PastoralReferral[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchReferrals = useCallback(async (params?: ReferralFilters) => {
    setReferralsLoading(true);
    try {
      const response = await apiClient.get('/pastoral/referrals', {
        params: params ?? initialFilters,
      });
      const raw = response.data.data ?? response.data;
      const list = Array.isArray(raw) ? raw : (raw.referrals ?? []);
      setReferrals(list);
      if (raw.total !== undefined) setTotal(raw.total as number);
    } catch (err: unknown) {
      console.warn(extractErrorMessage(err, 'Failed to load referrals'));
    } finally {
      setReferralsLoading(false);
    }
  }, [initialFilters]);

  const createReferral = useCallback(async (data: CreateReferralPayload): Promise<PastoralReferral> => {
    const response = await apiClient.post('/pastoral/referrals', data);
    const created = response.data.data ?? response.data;
    await fetchReferrals();
    return created as PastoralReferral;
  }, [fetchReferrals]);

  const updateReferral = useCallback(async (
    id: string,
    data: Partial<PastoralReferral>,
  ): Promise<PastoralReferral> => {
    const response = await apiClient.put(`/pastoral/referrals/${id}`, data);
    const updated = response.data.data ?? response.data;
    setReferrals((prev) =>
      prev.map((r) => (r.id === id ? (updated as PastoralReferral) : r)),
    );
    return updated as PastoralReferral;
  }, []);

  const resolveReferral = useCallback(async (
    id: string,
    data: ResolveReferralPayload,
  ): Promise<PastoralReferral> => {
    const response = await apiClient.put(`/pastoral/referrals/${id}/resolve`, data);
    const updated = response.data.data ?? response.data;
    setReferrals((prev) =>
      prev.map((r) => (r.id === id ? (updated as PastoralReferral) : r)),
    );
    return updated as PastoralReferral;
  }, []);

  useEffect(() => {
    void fetchReferrals();
  }, [fetchReferrals]);

  return {
    referrals,
    referralsLoading,
    total,
    fetchReferrals,
    createReferral,
    updateReferral,
    resolveReferral,
  };
}
