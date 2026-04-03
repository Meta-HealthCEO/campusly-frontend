'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Budget, CreateBudgetPayload } from '@/types';

export function useBudget() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [activeBudget, setActiveBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchBudgets = useCallback(async (year?: number) => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const params: Record<string, string | number> = { schoolId };
      if (year) params.year = year;
      const res = await apiClient.get('/budget/budgets', { params });
      const data = unwrapResponse<{ budgets: Budget[]; total: number }>(res);
      setBudgets(data.budgets ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      console.error('Failed to load budgets', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const fetchBudget = useCallback(async (id: string) => {
    if (!schoolId) return;
    try {
      const res = await apiClient.get(`/budget/budgets/${id}`);
      const budget = unwrapResponse<Budget>(res);
      setActiveBudget(budget);
      return budget;
    } catch (err: unknown) {
      console.error('Failed to load budget', err);
      return null;
    }
  }, [schoolId]);

  const createBudget = async (data: CreateBudgetPayload): Promise<Budget> => {
    const res = await apiClient.post('/budget/budgets', { ...data, schoolId });
    const budget = unwrapResponse<Budget>(res);
    toast.success('Budget created');
    await fetchBudgets();
    return budget;
  };

  const updateBudget = async (id: string, data: Partial<Budget>) => {
    const res = await apiClient.put(`/budget/budgets/${id}`, data);
    const budget = unwrapResponse<Budget>(res);
    toast.success('Budget updated');
    await fetchBudgets();
    return budget;
  };

  const deleteBudget = async (id: string) => {
    await apiClient.delete(`/budget/budgets/${id}`);
    toast.success('Budget deleted');
    await fetchBudgets();
  };

  return {
    budgets,
    activeBudget,
    loading,
    total,
    fetchBudgets,
    fetchBudget,
    createBudget,
    updateBudget,
    deleteBudget,
  };
}
