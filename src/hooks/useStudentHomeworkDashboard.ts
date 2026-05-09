'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

interface DashboardCounts {
  dueThisWeek: number;
  overdue: number;
  awaitingGrading: number;
}

export function useStudentHomeworkDashboard(): {
  counts: DashboardCounts | null;
  loading: boolean;
} {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    apiClient.get('/homework/student/dashboard', { signal: controller.signal })
      .then((res) => setCounts(unwrapResponse<DashboardCounts>(res)))
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        console.error('Failed to load homework dashboard', err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return { counts, loading };
}
