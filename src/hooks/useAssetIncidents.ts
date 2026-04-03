'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type { AssetIncident, CreateIncidentPayload } from '@/types';

interface IncidentFilters {
  assetId?: string;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useAssetIncidents() {
  const [incidents, setIncidents] = useState<AssetIncident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = useCallback(async (filters?: IncidentFilters) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/assets/incidents', { params: filters });
      setIncidents(unwrapList<AssetIncident>(res));
    } catch (err: unknown) {
      console.error('Failed to fetch asset incidents:', extractErrorMessage(err));
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createIncident = useCallback(async (
    assetId: string,
    data: CreateIncidentPayload,
  ): Promise<AssetIncident> => {
    const res = await apiClient.post(`/assets/${assetId}/incidents`, data);
    toast.success('Incident reported');
    const raw = res.data?.data ?? res.data;
    return raw as AssetIncident;
  }, []);

  const updateIncident = useCallback(async (
    id: string,
    data: Partial<CreateIncidentPayload> & { status?: string; resolution?: string; actualCost?: number },
  ): Promise<void> => {
    await apiClient.put(`/assets/incidents/${id}`, data);
    toast.success('Incident updated');
  }, []);

  return {
    incidents,
    loading,
    fetchIncidents,
    createIncident,
    updateIncident,
  };
}
