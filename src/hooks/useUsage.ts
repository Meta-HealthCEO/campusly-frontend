import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UsageMetric {
  current: number;
  limit: number; // -1 means unlimited
}

export interface UsageData {
  plan: 'free' | 'paid';
  usage: {
    students: UsageMetric;
    aiGenerations: UsageMetric;
    resources: UsageMetric;
    questions: UsageMetric;
    papers: UsageMetric;
    paperMarkings: UsageMetric;
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUsage() {
  // Only fetch when a user is authenticated. Otherwise we trigger a 401
  // on routes like /login that render layouts containing UsageBanner,
  // and the noisy redirect-to-login from the api-client interceptor
  // masks the fact that the user is already on the login page.
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = user !== null;

  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(isAuthenticated);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ data: UsageData }>('/schools/usage');
      const raw = response.data.data ?? response.data;
      setData(raw as UsageData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load usage data';
      setError(message);
      console.error('useUsage: failed to fetch usage', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void fetchUsage();
  }, [fetchUsage]);

  return { data, loading, error, refetch: fetchUsage };
}
