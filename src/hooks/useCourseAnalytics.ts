import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { CourseAnalytics } from '@/types';

export function useCourseAnalytics(courseId: string) {
  const [data, setData] = useState<CourseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!courseId) return;
    try {
      const res = await apiClient.get(`/courses/${courseId}/analytics`);
      setData(unwrapResponse<CourseAnalytics>(res));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to load analytics'));
    }
  }, [courseId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAnalytics();
    } finally {
      setRefreshing(false);
    }
  }, [fetchAnalytics]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await fetchAnalytics();
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [fetchAnalytics]);

  return { data, loading, refreshing, refresh };
}
