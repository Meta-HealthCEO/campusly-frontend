import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { Lesson, LessonsListResult, LessonStatus } from '@/types/lesson';

export interface LessonsFilters {
  classId?: string;
  subjectId?: string;
  status?: LessonStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
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
      const res = await apiClient.get('/lessons', { params: filters });
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

  return { items, total, loading, error, filters, setFilters, refetch: fetchList, deleteLesson };
}
