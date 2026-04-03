'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { SchoolBenchmark, BenchmarkConfig } from '@/types';

interface BenchmarkUpdatePayload {
  benchmarks?: Partial<BenchmarkConfig>;
  annualBudget?: number;
  monthlyExpenseEstimate?: number;
}

export function useBenchmarkConfig() {
  const [benchmark, setBenchmark] = useState<SchoolBenchmark | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchBenchmark = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/reports/principal/benchmarks');
      const data = unwrapResponse(res) as SchoolBenchmark | null;
      setBenchmark(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to fetch benchmark config', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBenchmark = useCallback(async (payload: BenchmarkUpdatePayload) => {
    setSaving(true);
    try {
      const res = await apiClient.put('/reports/principal/benchmarks', payload);
      const data = unwrapResponse(res) as SchoolBenchmark;
      setBenchmark(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to update benchmark config', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return { benchmark, loading, saving, fetchBenchmark, updateBenchmark };
}
