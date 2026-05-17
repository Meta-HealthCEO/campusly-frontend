import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { StudentDashboardDto } from '@/types';

interface UseStudentDashboardResult {
  dashboard: StudentDashboardDto | null;
  loading: boolean;
  refresh: () => void;
}

export function useStudentDashboard(): UseStudentDashboardResult {
  const [dashboard, setDashboard] = useState<StudentDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await apiClient.get('/student/dashboard');
        if (!cancelled) setDashboard(unwrapResponse<StudentDashboardDto>(response));
      } catch {
        if (!cancelled) setDashboard(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  return { dashboard, loading, refresh };
}
