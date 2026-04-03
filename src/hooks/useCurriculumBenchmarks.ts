'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import type {
  NationalBenchmark,
  CreateBenchmarkPayload,
  BenchmarkComparison,
  CurriculumIntervention,
  InterventionStatus,
} from '@/types';

interface BenchmarkParams {
  subjectId?: string;
  gradeId?: string;
  year?: number;
}

interface ComparisonParams {
  term?: number;
  year?: number;
  gradeId?: string;
}

interface InterventionParams {
  status?: InterventionStatus;
  term?: number;
  year?: number;
  page?: number;
  limit?: number;
}

interface InterventionUpdatePayload {
  status: InterventionStatus;
  notes?: string;
}

export function useCurriculumBenchmarks() {
  // ─── Benchmarks state ─────────────────────────────────────────────
  const [benchmarks, setBenchmarks] = useState<NationalBenchmark[]>([]);
  const [benchmarksLoading, setBenchmarksLoading] = useState(true);

  // ─── Interventions state ──────────────────────────────────────────
  const [interventions, setInterventions] = useState<CurriculumIntervention[]>([]);
  const [interventionsLoading, setInterventionsLoading] = useState(true);

  // ─── Benchmarks ───────────────────────────────────────────────────

  const fetchBenchmarks = useCallback(async (params?: BenchmarkParams): Promise<void> => {
    setBenchmarksLoading(true);
    try {
      const response = await apiClient.get('/curriculum/benchmarks', { params });
      setBenchmarks(unwrapList<NationalBenchmark>(response));
    } catch (err: unknown) {
      console.error('Failed to fetch benchmarks', err);
      setBenchmarks([]);
    } finally {
      setBenchmarksLoading(false);
    }
  }, []);

  const saveBenchmark = useCallback(
    async (data: CreateBenchmarkPayload): Promise<NationalBenchmark> => {
      const response = await apiClient.post('/curriculum/benchmarks', data);
      const saved = unwrapResponse<NationalBenchmark>(response);
      setBenchmarks((prev) => {
        const exists = prev.findIndex((b) => b.id === saved.id);
        if (exists >= 0) {
          return prev.map((b) => (b.id === saved.id ? saved : b));
        }
        return [...prev, saved];
      });
      return saved;
    },
    [],
  );

  const fetchComparison = useCallback(
    async (params?: ComparisonParams): Promise<BenchmarkComparison[]> => {
      try {
        const response = await apiClient.get('/curriculum/benchmarks/comparison', { params });
        return unwrapList<BenchmarkComparison>(response);
      } catch (err: unknown) {
        console.error('Failed to fetch benchmark comparison', err);
        return [];
      }
    },
    [],
  );

  const fetchTrends = useCallback(
    async (subjectId: string, gradeId: string): Promise<unknown> => {
      try {
        const response = await apiClient.get('/curriculum/benchmarks/trends', {
          params: { subjectId, gradeId },
        });
        return response.data.data ?? response.data;
      } catch (err: unknown) {
        console.error('Failed to fetch benchmark trends', err);
        return null;
      }
    },
    [],
  );

  // ─── Interventions ────────────────────────────────────────────────

  const fetchInterventions = useCallback(async (params?: InterventionParams): Promise<void> => {
    setInterventionsLoading(true);
    try {
      const response = await apiClient.get('/curriculum/interventions', { params });
      setInterventions(unwrapList<CurriculumIntervention>(response));
    } catch (err: unknown) {
      console.error('Failed to fetch interventions', err);
      setInterventions([]);
    } finally {
      setInterventionsLoading(false);
    }
  }, []);

  const updateIntervention = useCallback(
    async (id: string, data: InterventionUpdatePayload): Promise<CurriculumIntervention> => {
      const response = await apiClient.patch(`/curriculum/interventions/${id}`, data);
      const updated = unwrapResponse<CurriculumIntervention>(response);
      setInterventions((prev) => prev.map((i) => (i.id === id ? updated : i)));
      return updated;
    },
    [],
  );

  return {
    // Benchmarks
    benchmarks,
    benchmarksLoading,
    fetchBenchmarks,
    saveBenchmark,
    fetchComparison,
    fetchTrends,
    // Interventions
    interventions,
    interventionsLoading,
    fetchInterventions,
    updateIntervention,
  };
}
