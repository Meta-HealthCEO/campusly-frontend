'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

interface ChildSummary {
  studentId: string;
  firstName: string;
  lastName: string;
  pending: number;
  overdue: number;
  awaitingGrading: number;
}

export function useParentHomeworkSummary(): {
  children: ChildSummary[];
  loading: boolean;
} {
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    apiClient.get('/homework/parent/dashboard', { signal: controller.signal })
      .then((res) => setChildren(unwrapList<ChildSummary>(res)))
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        console.error('Failed to load parent homework summary', err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return { children, loading };
}
