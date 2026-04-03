'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type { AssetLocation, CreateLocationPayload } from '@/types';

interface LocationFilters {
  type?: string;
  building?: string;
  department?: string;
  search?: string;
}

export function useAssetLocations() {
  const [locations, setLocations] = useState<AssetLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = useCallback(async (filters?: LocationFilters) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/assets/locations', { params: filters });
      setLocations(unwrapList<AssetLocation>(res));
    } catch (err: unknown) {
      console.error('Failed to fetch asset locations:', extractErrorMessage(err));
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createLocation = async (data: CreateLocationPayload): Promise<AssetLocation> => {
    const res = await apiClient.post('/assets/locations', data);
    const created = unwrapResponse<AssetLocation>(res);
    toast.success('Location created');
    await fetchLocations();
    return created;
  };

  const updateLocation = async (id: string, data: Partial<CreateLocationPayload>): Promise<void> => {
    await apiClient.put(`/assets/locations/${id}`, data);
    toast.success('Location updated');
    await fetchLocations();
  };

  const deleteLocation = async (id: string): Promise<void> => {
    await apiClient.delete(`/assets/locations/${id}`);
    toast.success('Location deleted');
    await fetchLocations();
  };

  return {
    locations,
    loading,
    fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
  };
}
