'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { Career } from '@/types';

interface CareerFilters {
  cluster?: string;
  search?: string;
}

interface UseCareerExplorerReturn {
  careers: Career[];
  loading: boolean;
  error: string | null;
  refetch: (filters?: CareerFilters) => Promise<void>;
}

export function useCareerExplorer(initialFilters?: CareerFilters): UseCareerExplorerReturn {
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCareers = useCallback(async (filters?: CareerFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filters?.cluster) params.cluster = filters.cluster;
      if (filters?.search) params.search = filters.search;

      const response = await apiClient.get('/careers/explorer', { params });
      const data = unwrapList<Career>(response);
      setCareers(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load careers';
      setError(message);
      console.error('Failed to load careers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCareers(initialFilters);
  }, [fetchCareers]);

  return {
    careers,
    loading,
    error,
    refetch: fetchCareers,
  };
}
