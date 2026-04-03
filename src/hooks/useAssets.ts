'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type {
  Asset,
  CreateAssetPayload,
  AssetFilters,
  AssignPayload,
} from '@/types';

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAssets = useCallback(async (filters?: AssetFilters) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/assets', { params: filters });
      const raw = unwrapResponse<{ assets?: Asset[]; total?: number }>(res);
      if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        const list = Array.isArray(obj.assets) ? (obj.assets as Asset[]) : [];
        setAssets(list);
        setTotal((obj.total as number) ?? list.length);
      } else {
        const list = unwrapList<Asset>(res);
        setAssets(list);
        setTotal(list.length);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch assets:', extractErrorMessage(err));
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAsset = useCallback(async (id: string): Promise<Asset> => {
    const res = await apiClient.get(`/assets/${id}`);
    return unwrapResponse<Asset>(res);
  }, []);

  const createAsset = useCallback(async (data: CreateAssetPayload): Promise<Asset> => {
    const res = await apiClient.post('/assets', data);
    toast.success('Asset created');
    return unwrapResponse<Asset>(res);
  }, []);

  const updateAsset = useCallback(async (id: string, data: Partial<CreateAssetPayload>): Promise<void> => {
    await apiClient.put(`/assets/${id}`, data);
    toast.success('Asset updated');
  }, []);

  const deleteAsset = useCallback(async (id: string): Promise<void> => {
    await apiClient.delete(`/assets/${id}`);
    toast.success('Asset deleted');
  }, []);

  const assignAsset = useCallback(async (id: string, data: AssignPayload): Promise<void> => {
    await apiClient.post(`/assets/${id}/assign`, data);
    toast.success('Asset assigned');
  }, []);

  const unassignAsset = useCallback(async (id: string): Promise<void> => {
    await apiClient.post(`/assets/${id}/unassign`);
    toast.success('Asset unassigned');
  }, []);

  return {
    assets,
    total,
    loading,
    fetchAssets,
    fetchAsset,
    createAsset,
    updateAsset,
    deleteAsset,
    assignAsset,
    unassignAsset,
  };
}
