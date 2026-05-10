'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

export interface RecentTopic {
  id: string;
  title: string;
  termNumber: number | null;
  subjectId: string | null;
  gradeId: string | null;
}

export interface RecentTopicsResult {
  items: RecentTopic[];
  loading: boolean;
}

/**
 * Fetches the teacher's most recently used curriculum topics for the
 * "you've been here before" chips on the new-lesson topic picker.
 *
 * Backed by `GET /lessons/recent-topics`, which deduplicates by topic
 * and returns latest first.
 */
export function useRecentTopics(limit = 6): RecentTopicsResult {
  const [items, setItems] = useState<RecentTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/lessons/recent-topics', {
          params: { limit },
        });
        const result = unwrapResponse<{ items: RecentTopic[] }>(response);
        if (!cancelled) setItems(result.items ?? []);
      } catch (err: unknown) {
        if (!cancelled) {
          console.warn('Failed to load recent topics', err);
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { items, loading };
}
