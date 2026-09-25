import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { AIUsage } from '@/lib/ai-allowance';

const SCHOOL: AIUsage = { plan: 'school' };

/**
 * This month's AI actions for a standalone teacher. School users' AI is
 * covered by their school, so nothing is fetched for them.
 */
export function useAIUsage() {
  const isStandalone = useAuthStore((s) => s.user?.isStandaloneTeacher === true);
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [loading, setLoading] = useState(isStandalone);

  const refetch = useCallback(async (): Promise<void> => {
    if (!isStandalone) {
      setUsage(SCHOOL);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setUsage(unwrapResponse<AIUsage>(await apiClient.get('/subscriptions/ai-usage')));
    } catch (err: unknown) {
      // Not fatal: the server still enforces the allowance; the page just shows no meter.
      console.error('Failed to load AI usage', err);
    } finally {
      setLoading(false);
    }
  }, [isStandalone]);

  useEffect(() => { void refetch(); }, [refetch]);

  return { usage, loading, refetch };
}
