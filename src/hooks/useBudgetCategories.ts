'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { BudgetCategory, CreateCategoryPayload } from '@/types';

export function useBudgetCategories() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await apiClient.get('/budget/categories', { params: { schoolId } });
      const data = unwrapList<BudgetCategory>(res);
      setCategories(data);
    } catch (err: unknown) {
      console.error('Failed to load budget categories', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Flat list of all categories (including children) for select dropdowns
  const flatCategories: BudgetCategory[] = categories.flatMap((cat) => [
    cat,
    ...(cat.children ?? []),
  ]);

  const createCategory = async (data: CreateCategoryPayload): Promise<BudgetCategory> => {
    const res = await apiClient.post('/budget/categories', { ...data, schoolId });
    const created = unwrapResponse<BudgetCategory>(res);
    toast.success('Category created');
    await fetchCategories();
    return created;
  };

  const updateCategory = async (id: string, data: Partial<BudgetCategory>) => {
    await apiClient.put(`/budget/categories/${id}`, data);
    toast.success('Category updated');
    await fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    await apiClient.delete(`/budget/categories/${id}`);
    toast.success('Category deleted');
    await fetchCategories();
  };

  const seedCategories = async () => {
    await apiClient.post('/budget/categories/seed', { schoolId });
    toast.success('Default categories seeded');
    await fetchCategories();
  };

  return {
    categories,
    flatCategories,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    seedCategories,
  };
}
