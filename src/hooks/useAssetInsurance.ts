'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type { AssetInsurance, CreateInsurancePayload } from '@/types';

export function useAssetInsurance() {
  const [insurance, setInsurance] = useState<AssetInsurance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInsurance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/assets/insurance');
      setInsurance(unwrapList<AssetInsurance>(res));
    } catch (err: unknown) {
      console.error('Failed to fetch asset insurance:', extractErrorMessage(err));
      setInsurance([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExpiringInsurance = useCallback(async (days = 30): Promise<AssetInsurance[]> => {
    const res = await apiClient.get('/assets/insurance/expiring', { params: { days } });
    return unwrapList<AssetInsurance>(res);
  }, []);

  const createInsurance = async (data: CreateInsurancePayload): Promise<AssetInsurance> => {
    const res = await apiClient.post('/assets/insurance', data);
    const created = unwrapResponse<AssetInsurance>(res);
    toast.success('Insurance policy added');
    await fetchInsurance();
    return created;
  };

  const updateInsurance = async (id: string, data: Partial<CreateInsurancePayload>): Promise<void> => {
    await apiClient.put(`/assets/insurance/${id}`, data);
    toast.success('Insurance policy updated');
    await fetchInsurance();
  };

  return {
    insurance,
    loading,
    fetchInsurance,
    fetchExpiringInsurance,
    createInsurance,
    updateInsurance,
  };
}
