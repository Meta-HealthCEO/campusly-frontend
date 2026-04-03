'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type { AssetCheckOut, CheckOutPayload, CheckInPayload, CheckOutFilters } from '@/types';

export function useAssetCheckOuts() {
  const [checkOuts, setCheckOuts] = useState<AssetCheckOut[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCheckOuts = useCallback(async (filters?: CheckOutFilters) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/assets/check-outs', { params: filters });
      setCheckOuts(unwrapList<AssetCheckOut>(res));
    } catch (err: unknown) {
      console.error('Failed to fetch check-outs:', extractErrorMessage(err));
      setCheckOuts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkOut = useCallback(async (assetId: string, data: CheckOutPayload): Promise<AssetCheckOut> => {
    const res = await apiClient.post(`/assets/${assetId}/check-out`, data);
    toast.success('Asset checked out');
    const raw = res.data?.data ?? res.data;
    return raw as AssetCheckOut;
  }, []);

  const checkIn = useCallback(async (assetId: string, data: CheckInPayload): Promise<AssetCheckOut> => {
    const res = await apiClient.post(`/assets/${assetId}/check-in`, data);
    toast.success('Asset checked in');
    const raw = res.data?.data ?? res.data;
    return raw as AssetCheckOut;
  }, []);

  return {
    checkOuts,
    loading,
    fetchCheckOuts,
    checkOut,
    checkIn,
  };
}
