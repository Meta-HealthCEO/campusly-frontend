'use client';

import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type { Bursary, CareersPaginatedResponse } from '@/types';

export interface BursaryFilters {
  field?: string;
  provider?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UseBursariesReturn {
  bursaries: Bursary[];
  matchedBursaries: Bursary[];
  total: number;
  totalPages: number;
  page: number;
  loading: boolean;
  error: string | null;
  refetch: (filters?: BursaryFilters) => Promise<void>;
  fetchMatched: (studentId: string) => Promise<void>;
  fetchById: (id: string) => Promise<Bursary>;
  createBursary: (data: Record<string, unknown>) => Promise<Bursary>;
  updateBursary: (id: string, data: Record<string, unknown>) => Promise<Bursary>;
  importBursaries: (file: File) => Promise<{ imported: number; skipped: number; errors: { row: number; reason: string }[] }>;
}

export function useBursaries(initialFilters?: BursaryFilters): UseBursariesReturn {
  const [bursaries, setBursaries] = useState<Bursary[]>([]);
  const [matchedBursaries, setMatchedBursaries] = useState<Bursary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(initialFilters?.page ?? 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBursaries = useCallback(async (filters?: BursaryFilters) => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | number> = {};
      const merged = { ...initialFilters, ...filters };

      if (merged.field) params.field = merged.field;
      if (merged.provider) params.provider = merged.provider;
      if (merged.search) params.search = merged.search;
      if (merged.page != null) params.page = merged.page;
      if (merged.limit != null) params.limit = merged.limit;

      const response = await apiClient.get('/careers/bursaries', { params });
      const data = unwrapResponse<CareersPaginatedResponse<Bursary>>(response);

      setBursaries(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Failed to load bursaries');
      setError(message);
      console.error('Failed to load bursaries:', err);
    } finally {
      setLoading(false);
    }
  }, [initialFilters]);

  const fetchMatched = useCallback(async (studentId: string) => {
    try {
      setError(null);
      const response = await apiClient.get(
        `/careers/bursaries/match/student/${studentId}`,
      );
      const items = unwrapList<Bursary>(response);
      setMatchedBursaries(items);
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Failed to load matched bursaries');
      setError(message);
      console.error('Failed to load matched bursaries:', err);
    }
  }, []);

  const fetchById = useCallback(async (id: string): Promise<Bursary> => {
    const response = await apiClient.get(`/careers/bursaries/${id}`);
    return unwrapResponse<Bursary>(response);
  }, []);

  const createBursary = useCallback(async (data: Record<string, unknown>): Promise<Bursary> => {
    const res = await apiClient.post('/careers/bursaries', data);
    const b = unwrapResponse<Bursary>(res);
    await fetchBursaries();
    return b;
  }, [fetchBursaries]);

  const updateBursary = useCallback(async (id: string, data: Record<string, unknown>): Promise<Bursary> => {
    const res = await apiClient.put(`/careers/bursaries/${id}`, data);
    const b = unwrapResponse<Bursary>(res);
    await fetchBursaries();
    return b;
  }, [fetchBursaries]);

  const importBursaries = useCallback(async (file: File): Promise<{ imported: number; skipped: number; errors: { row: number; reason: string }[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/careers/bursaries/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    await fetchBursaries();
    return unwrapResponse(res);
  }, [fetchBursaries]);

  useEffect(() => {
    fetchBursaries(initialFilters);
  }, [fetchBursaries, initialFilters]);

  return {
    bursaries,
    matchedBursaries,
    total,
    totalPages,
    page,
    loading,
    error,
    refetch: fetchBursaries,
    fetchMatched,
    fetchById,
    createBursary,
    updateBursary,
    importBursaries,
  };
}
