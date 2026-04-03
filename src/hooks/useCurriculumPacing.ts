'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import type {
  CurriculumPlan,
  CreatePlanPayload,
  PacingUpdate,
  PacingUpdatePayload,
  PacingOverview,
  PlanFilters,
} from '@/types';

interface OverviewParams {
  term?: number;
  year?: number;
}

export function useCurriculumPacing() {
  // ─── Plans state ─────────────────────────────────────────────────
  const [plans, setPlans] = useState<CurriculumPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // ─── Overview state ───────────────────────────────────────────────
  const [overview, setOverview] = useState<PacingOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // ─── Plans ────────────────────────────────────────────────────────

  const fetchPlans = useCallback(async (filters?: PlanFilters) => {
    setPlansLoading(true);
    try {
      const response = await apiClient.get('/curriculum/plans', { params: filters });
      setPlans(unwrapList(response));
    } catch (err: unknown) {
      console.error('Failed to fetch curriculum plans', err);
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const createPlan = useCallback(async (data: CreatePlanPayload): Promise<CurriculumPlan> => {
    const response = await apiClient.post('/curriculum/plans', data);
    const created = unwrapResponse<CurriculumPlan>(response);
    setPlans((prev) => [...prev, created]);
    return created;
  }, []);

  const updatePlan = useCallback(
    async (id: string, data: Partial<CreatePlanPayload>): Promise<CurriculumPlan> => {
      const response = await apiClient.put(`/curriculum/plans/${id}`, data);
      const updated = unwrapResponse<CurriculumPlan>(response);
      setPlans((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
    [],
  );

  const deletePlan = useCallback(async (id: string): Promise<void> => {
    await apiClient.delete(`/curriculum/plans/${id}`);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ─── Progress ─────────────────────────────────────────────────────

  const submitProgress = useCallback(
    async (planId: string, data: PacingUpdatePayload): Promise<PacingUpdate> => {
      const response = await apiClient.post(`/curriculum/plans/${planId}/progress`, data);
      return unwrapResponse<PacingUpdate>(response);
    },
    [],
  );

  const fetchProgressHistory = useCallback(async (planId: string): Promise<PacingUpdate[]> => {
    try {
      const response = await apiClient.get(`/curriculum/plans/${planId}/progress`);
      return unwrapList<PacingUpdate>(response);
    } catch (err: unknown) {
      console.error('Failed to fetch progress history', err);
      return [];
    }
  }, []);

  // ─── Overview ─────────────────────────────────────────────────────

  const fetchOverview = useCallback(async (params?: OverviewParams): Promise<void> => {
    setOverviewLoading(true);
    try {
      const response = await apiClient.get('/curriculum/pacing/overview', { params });
      setOverview(unwrapResponse<PacingOverview>(response));
    } catch (err: unknown) {
      console.error('Failed to fetch pacing overview', err);
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  return {
    // Plans
    plans,
    plansLoading,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
    // Progress
    submitProgress,
    fetchProgressHistory,
    // Overview
    overview,
    overviewLoading,
    fetchOverview,
  };
}
