import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { StudentDashboardDto } from '@/types';

interface UseStudentDashboardResult {
  dashboard: StudentDashboardDto | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useStudentDashboard(): UseStudentDashboardResult {
  const [dashboard, setDashboard] = useState<StudentDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get('/student/dashboard');
        if (!cancelled) setDashboard(unwrapResponse<StudentDashboardDto>(response));
      } catch (err: unknown) {
        console.error('Failed to load the learner dashboard', err);
        if (!cancelled) { setDashboard(null); setError("Today couldn't load. Check your connection and try again."); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  return { dashboard, loading, error, refresh };
}
