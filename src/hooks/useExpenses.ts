'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Expense, CreateExpensePayload, ExpenseFilters } from '@/types';

export function useExpenses() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchExpenses = useCallback(async (filters?: ExpenseFilters) => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const params: Record<string, string | number> = { schoolId };
      if (filters?.categoryId) params.categoryId = filters.categoryId;
      if (filters?.budgetId) params.budgetId = filters.budgetId;
      if (filters?.status) params.status = filters.status;
      if (filters?.term) params.term = filters.term;
      if (filters?.startDate) params.startDate = filters.startDate;
      if (filters?.endDate) params.endDate = filters.endDate;
      if (filters?.page) params.page = filters.page;
      if (filters?.limit) params.limit = filters.limit;

      const res = await apiClient.get('/budget/expenses', { params });
      const data = unwrapResponse<{ expenses: Expense[]; total: number }>(res);
      setExpenses(data.expenses ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      console.error('Failed to load expenses', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const fetchPendingExpenses = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await apiClient.get('/budget/expenses', {
        params: { schoolId, status: 'pending' },
      });
      const data = unwrapResponse<{ expenses: Expense[]; total: number }>(res);
      setPendingExpenses(data.expenses ?? []);
    } catch (err: unknown) {
      console.error('Failed to load pending expenses', err);
    }
  }, [schoolId]);

  const createExpense = async (data: CreateExpensePayload): Promise<Expense> => {
    const res = await apiClient.post('/budget/expenses', { ...data, schoolId });
    const expense = unwrapResponse<Expense>(res);
    toast.success('Expense recorded');
    return expense;
  };

  const updateExpense = async (id: string, data: Partial<Expense>) => {
    await apiClient.put(`/budget/expenses/${id}`, data);
    toast.success('Expense updated');
  };

  const deleteExpense = async (id: string) => {
    await apiClient.delete(`/budget/expenses/${id}`);
    toast.success('Expense deleted');
  };

  const approveExpense = async (id: string, notes?: string) => {
    await apiClient.post(`/budget/expenses/${id}/approve`, { notes });
    toast.success('Expense approved');
  };

  const rejectExpense = async (id: string, reason: string) => {
    await apiClient.post(`/budget/expenses/${id}/reject`, { reason });
    toast.success('Expense rejected');
  };

  const uploadReceipt = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('receipt', file);
    const res = await apiClient.post('/budget/expenses/upload-receipt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = unwrapResponse<{ url: string }>(res);
    return data.url;
  };

  return {
    expenses,
    pendingExpenses,
    loading,
    total,
    fetchExpenses,
    fetchPendingExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    approveExpense,
    rejectExpense,
    uploadReceipt,
  };
}
