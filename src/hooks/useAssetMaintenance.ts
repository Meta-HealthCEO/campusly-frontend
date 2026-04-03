'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type { AssetMaintenance, CreateMaintenancePayload } from '@/types';

export function useAssetMaintenance() {
  const [records, setRecords] = useState<AssetMaintenance[]>([]);
  const [upcoming, setUpcoming] = useState<AssetMaintenance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchByAsset = useCallback(async (assetId: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/assets/${assetId}/maintenance`);
      setRecords(unwrapList<AssetMaintenance>(res));
    } catch (err: unknown) {
      console.error('Failed to fetch maintenance records:', extractErrorMessage(err));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUpcoming = useCallback(async (days = 30) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/assets/maintenance/upcoming', { params: { days } });
      setUpcoming(unwrapList<AssetMaintenance>(res));
    } catch (err: unknown) {
      console.error('Failed to fetch upcoming maintenance:', extractErrorMessage(err));
      setUpcoming([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createMaintenance = useCallback(async (
    assetId: string,
    data: CreateMaintenancePayload,
  ): Promise<AssetMaintenance> => {
    const res = await apiClient.post(`/assets/${assetId}/maintenance`, data);
    toast.success('Maintenance record created');
    const raw = res.data?.data ?? res.data;
    return raw as AssetMaintenance;
  }, []);

  const updateMaintenance = useCallback(async (
    id: string,
    data: Partial<CreateMaintenancePayload>,
  ): Promise<void> => {
    await apiClient.put(`/assets/maintenance/${id}`, data);
    toast.success('Maintenance record updated');
  }, []);

  return {
    records,
    upcoming,
    loading,
    fetchByAsset,
    fetchUpcoming,
    createMaintenance,
    updateMaintenance,
  };
}
