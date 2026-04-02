'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { FullStudent360Data } from '@/types/student-360';

interface UseFullStudent360Result {
  data: FullStudent360Data | null;
  loading: boolean;
  error: string | null;
  loadStudent360: (studentId: string) => Promise<void>;
}

export function useFullStudent360(): UseFullStudent360Result {
  const [data, setData] = useState<FullStudent360Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStudent360 = useCallback(async (studentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/reports/student/${studentId}/360`);
      const result = unwrapResponse<FullStudent360Data>(response);
      setData(result);
    } catch (err: unknown) {
      console.error('Failed to load student 360 view');
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr?.response?.data?.error ?? 'Failed to load student data';
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, loadStudent360 };
}
