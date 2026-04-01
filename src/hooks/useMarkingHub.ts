import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { MarkingItem } from '@/types';

export function useMarkingHub() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const [items, setItems] = useState<MarkingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/teacher-workbench/marking-hub/pending', {
        params: { schoolId },
      });
      setItems(unwrapList<MarkingItem>(res));
    } catch (err: unknown) {
      console.error('Failed to load marking hub items', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const overdueCount = items.filter(
    (item) => item.dueDate < todayStr && item.priority === 'high',
  ).length;

  const dueTodayCount = items.filter(
    (item) => item.dueDate === todayStr,
  ).length;

  return {
    items,
    loading,
    overdueCount,
    dueTodayCount,
    fetchPending,
  };
}
