import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { FinanceSummary, MonthlyTrend } from '@/types';

export function useSgbFinance() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [period, setPeriod] = useState('annual');
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await apiClient.get('/sgb/finance/summary', {
        params: { schoolId, period, year },
      });
      const data = unwrapResponse<FinanceSummary>(res);
      setSummary(data);
    } catch (err: unknown) {
      console.error('Failed to load financial summary', err);
    }
  }, [schoolId, period, year]);

  const fetchTrends = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await apiClient.get('/sgb/finance/trends', {
        params: { schoolId, year },
      });
      const raw = unwrapResponse(res);
      setTrends((raw.months ?? []) as MonthlyTrend[]);
    } catch (err: unknown) {
      console.error('Failed to load finance trends', err);
    }
  }, [schoolId, year]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSummary(), fetchTrends()]).finally(() => setLoading(false));
  }, [fetchSummary, fetchTrends]);

  return { summary, trends, period, year, loading, setPeriod, setYear, fetchSummary, fetchTrends };
}
