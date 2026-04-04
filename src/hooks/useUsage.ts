import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';

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
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void fetchUsage();
  }, [fetchUsage]);

  return { data, loading, error, refetch: fetchUsage };
}
