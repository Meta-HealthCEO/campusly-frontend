import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { Programme, QualificationType, CareersPaginatedResponse } from '@/types';

interface ProgrammeFilters {
  universityId?: string;
  faculty?: string;
  qualificationType?: QualificationType;
  maxAPS?: number;
  field?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface UseProgrammesReturn {
  programmes: Programme[];
  total: number;
  totalPages: number;
  page: number;
  loading: boolean;
  error: string | null;
  refetch: (filters?: ProgrammeFilters) => Promise<void>;
  fetchById: (id: string) => Promise<Programme>;
}

export function useProgrammes(initialFilters?: ProgrammeFilters): UseProgrammesReturn {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgrammes = useCallback(async (filters?: ProgrammeFilters) => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | number> = {};
      const merged = filters ?? initialFilters;

      if (merged?.universityId) params.universityId = merged.universityId;
      if (merged?.faculty) params.faculty = merged.faculty;
      if (merged?.qualificationType) params.qualificationType = merged.qualificationType;
      if (merged?.maxAPS) params.maxAPS = merged.maxAPS;
      if (merged?.field) params.field = merged.field;
      if (merged?.search) params.search = merged.search;
      if (merged?.page) params.page = merged.page;
      if (merged?.limit) params.limit = merged.limit;

      const response = await apiClient.get('/careers/programmes', { params });
      const data = unwrapResponse<CareersPaginatedResponse<Programme>>(response);

      setProgrammes(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load programmes');
      setError(msg);
      console.error('useProgrammes.fetchProgrammes:', msg);
    } finally {
      setLoading(false);
    }
  }, [initialFilters]);

  const fetchById = useCallback(async (id: string): Promise<Programme> => {
    const response = await apiClient.get(`/careers/programmes/${id}`);
    return unwrapResponse<Programme>(response);
  }, []);

  useEffect(() => {
    void fetchProgrammes(initialFilters);
  }, [fetchProgrammes, initialFilters]);

  return {
    programmes,
    total,
    totalPages,
    page,
    loading,
    error,
    refetch: fetchProgrammes,
    fetchById,
  };
}
