import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
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

  const fetchReferrals = async (params?: ReferralFilters) => {
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
      console.error('Failed to load referrals', err);
    } finally {
      setReferralsLoading(false);
    }
  };

  const createReferral = async (data: CreateReferralPayload): Promise<PastoralReferral> => {
    const response = await apiClient.post('/pastoral/referrals', data);
    const created = response.data.data ?? response.data;
    await fetchReferrals();
    return created as PastoralReferral;
  };

  const updateReferral = async (
    id: string,
    data: Partial<PastoralReferral>,
  ): Promise<PastoralReferral> => {
    const response = await apiClient.put(`/pastoral/referrals/${id}`, data);
    const updated = response.data.data ?? response.data;
    setReferrals((prev) =>
      prev.map((r) => (r.id === id ? (updated as PastoralReferral) : r)),
    );
    return updated as PastoralReferral;
  };

  const resolveReferral = async (
    id: string,
    data: ResolveReferralPayload,
  ): Promise<PastoralReferral> => {
    const response = await apiClient.put(`/pastoral/referrals/${id}/resolve`, data);
    const updated = response.data.data ?? response.data;
    setReferrals((prev) =>
      prev.map((r) => (r.id === id ? (updated as PastoralReferral) : r)),
    );
    return updated as PastoralReferral;
  };

  useEffect(() => {
    void fetchReferrals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
