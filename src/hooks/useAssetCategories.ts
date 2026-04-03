'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { AssetCategory, CreateAssetCategoryPayload } from '@/types';

function flattenCategories(categories: AssetCategory[]): AssetCategory[] {
  return categories.flatMap((cat) => [cat, ...(cat.children ?? [])]);
}

export function useAssetCategories() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await apiClient.get('/assets/categories', { params: { schoolId } });
      setCategories(unwrapList<AssetCategory>(res));
    } catch (err: unknown) {
      console.error('Failed to load asset categories', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const flatCategories = flattenCategories(categories);

  const createCategory = async (data: CreateAssetCategoryPayload): Promise<AssetCategory> => {
    const res = await apiClient.post('/assets/categories', { ...data, schoolId });
    const created = unwrapResponse<AssetCategory>(res);
    toast.success('Category created');
    await fetchCategories();
    return created;
  };

  const updateCategory = async (id: string, data: Partial<CreateAssetCategoryPayload>): Promise<void> => {
    await apiClient.put(`/assets/categories/${id}`, data);
    toast.success('Category updated');
    await fetchCategories();
  };

  const deleteCategory = async (id: string): Promise<void> => {
    await apiClient.delete(`/assets/categories/${id}`);
    toast.success('Category deleted');
    await fetchCategories();
  };

  const seedCategories = async (): Promise<void> => {
    await apiClient.post('/assets/categories/seed', { schoolId });
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
