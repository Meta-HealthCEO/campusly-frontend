import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { Lesson, LessonsListResult } from '@/types/lesson';

export interface LessonsFilters {
  classId?: string;
  subjectId?: string;
  /** When true, return only published lessons. */
  published?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function dateFilterToApiDateTime(value: string | undefined, endOfDay = false): string | undefined {
  if (!value) return undefined;
  if (value.includes('T')) return value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const [year, month, day] = value.split('-').map(Number);
  const date = endOfDay
    ? new Date(year, (month ?? 1) - 1, day ?? 1, 23, 59, 59, 999)
    : new Date(year, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0);
  return date.toISOString();
}

function toLessonListParams(filters: LessonsFilters): LessonsFilters {
  return {
    ...filters,
    dateFrom: dateFilterToApiDateTime(filters.dateFrom),
    dateTo: dateFilterToApiDateTime(filters.dateTo, true),
  };
}

export function useLessons(initial: LessonsFilters = {}) {
  const [filters, setFilters] = useState<LessonsFilters>({ page: 1, limit: 20, ...initial });
  const [items, setItems] = useState<Lesson[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/lessons', { params: toLessonListParams(filters) });
      const data = unwrapResponse<LessonsListResult>(res);
      setItems(data.items);
      setTotal(data.total);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load lessons';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const deleteLesson = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/lessons/${id}`);
      await fetchList();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete lesson');
      throw err;
    }
  }, [fetchList]);

  /** Duplicate a lesson — copies materials, resets assignments + status to draft. */
  const cloneLesson = useCallback(async (id: string, title?: string): Promise<Lesson | null> => {
    try {
      const res = await apiClient.post(`/lessons/${id}/clone`, title ? { title } : {});
      await fetchList();
      toast.success('Lesson duplicated — adjust dates and assign to a class');
      return unwrapResponse<Lesson>(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate lesson');
      return null;
    }
  }, [fetchList]);

  return {
    items, total, loading, error, filters, setFilters, refetch: fetchList,
    deleteLesson, cloneLesson,
  };
}
