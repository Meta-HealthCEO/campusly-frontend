import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { SubjectMastery } from '@/types';

export interface ChildInsights {
  childName: string;
  grade: number;
  mastery: SubjectMastery[];
}

/**
 * Privacy-safe view of how a linked child is doing: mastery snapshot only.
 * Chat history with Buddy is NOT returned — the parent should never see what
 * the child has said to Buddy.
 */
export function useParentChildInsights(studentId: string | null) {
  const [insights, setInsights] = useState<ChildInsights | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!studentId) {
      setInsights(null);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get(`/ai-tutor/parent/child/${studentId}/insights`);
      setInsights(unwrapResponse<ChildInsights>(res));
    } catch (err: unknown) {
      console.error('Failed to load child insights', err);
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { insights, loading, refresh };
}
