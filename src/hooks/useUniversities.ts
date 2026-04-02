import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { University, UniversityType, CareersPaginatedResponse } from '@/types';

interface UniversityFilters {
  type?: UniversityType;
  province?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface UseUniversitiesReturn {
  universities: University[];
  total: number;
  totalPages: number;
  page: number;
  loading: boolean;
  error: string | null;
  refetch: (filters?: UniversityFilters) => Promise<void>;
  fetchById: (id: string) => Promise<University>;
  createUniversity: (data: Record<string, unknown>) => Promise<University>;
  updateUniversity: (id: string, data: Record<string, unknown>) => Promise<University>;
}

export function useUniversities(initialFilters?: UniversityFilters): UseUniversitiesReturn {
  const [universities, setUniversities] = useState<University[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUniversities = useCallback(async (filters?: UniversityFilters) => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | number> = {};
      const merged = filters ?? initialFilters;

      if (merged?.type) params.type = merged.type;
      if (merged?.province) params.province = merged.province;
      if (merged?.search) params.search = merged.search;
      if (merged?.page) params.page = merged.page;
      if (merged?.limit) params.limit = merged.limit;

      const response = await apiClient.get('/careers/universities', { params });
      const data = unwrapResponse<CareersPaginatedResponse<University>>(response);

      setUniversities(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load universities');
      setError(msg);
      console.error('useUniversities.fetchUniversities:', msg);
    } finally {
      setLoading(false);
    }
  }, [initialFilters]);

  const fetchById = useCallback(async (id: string): Promise<University> => {
    const response = await apiClient.get(`/careers/universities/${id}`);
    return unwrapResponse<University>(response);
  }, []);

  const createUniversity = useCallback(async (data: Record<string, unknown>): Promise<University> => {
    const res = await apiClient.post('/careers/universities', data);
    const uni = unwrapResponse<University>(res);
    await fetchUniversities();
    return uni;
  }, [fetchUniversities]);

  const updateUniversity = useCallback(async (id: string, data: Record<string, unknown>): Promise<University> => {
    const res = await apiClient.put(`/careers/universities/${id}`, data);
    const uni = unwrapResponse<University>(res);
    await fetchUniversities();
    return uni;
  }, [fetchUniversities]);

  useEffect(() => {
    void fetchUniversities(initialFilters);
  }, [fetchUniversities, initialFilters]);

  return {
    universities,
    total,
    totalPages,
    page,
    loading,
    error,
    refetch: fetchUniversities,
    fetchById,
    createUniversity,
    updateUniversity,
  };
}
