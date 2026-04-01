import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { WorkbenchDashboardData } from '@/types';

interface UseWorkbenchDashboardReturn {
  data: WorkbenchDashboardData | null;
  loading: boolean;
}

export function useWorkbenchDashboard(): UseWorkbenchDashboardReturn {
  const { user } = useAuthStore();
  const [data, setData] = useState<WorkbenchDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!user?.schoolId) return;
    try {
      const response = await apiClient.get('/teacher-workbench/dashboard', {
        params: { schoolId: user.schoolId },
      });
      const result = unwrapResponse<WorkbenchDashboardData>(response);
      setData(result);
    } catch (err: unknown) {
      console.error('Failed to load workbench dashboard', err);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading };
}
