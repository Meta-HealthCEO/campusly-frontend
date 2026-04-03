'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { MoodDashboardData } from '@/types';

export function useMoodDashboard() {
  const [data, setData] = useState<MoodDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async (params?: {
    period?: 'week' | 'month' | 'term';
    gradeFilter?: number;
  }) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/wellbeing/mood-dashboard', { params });
      const result = unwrapResponse<MoodDashboardData>(response);
      setData(result);
    } catch (err: unknown) {
      console.error('Failed to fetch mood dashboard', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, fetchDashboard };
}
