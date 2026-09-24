'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse } from '@/lib/api-helpers';
import type { UnitInsight } from '@/lib/unit-insight';

/** Who is where in a released unit, who is stuck, and the most-missed questions. */
export function useUnitInsight(courseId: string, enabled: boolean) {
  const [insight, setInsight] = useState<UnitInsight | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setInsight(unwrapResponse<UnitInsight>(await apiClient.get(`/courses/${courseId}/insight`)));
      setError(null);
    } catch (err: unknown) {
      console.error('Unit insight failed', err);
      setError(extractErrorMessage(err, "Couldn't load your class's progress. Refresh to try again."));
    }
  }, [courseId]);

  useEffect(() => {
    if (!enabled || !courseId) return;
    void load();
  }, [courseId, enabled, load]);


  return { insight: enabled ? insight : null, error, refresh: load };
}
