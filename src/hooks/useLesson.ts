import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { Lesson, LessonMaterial, LessonPhase, LessonStatus } from '@/types/lesson';

export function useLesson(id: string) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOne = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/lessons/${id}`);
      setLesson(unwrapResponse<Lesson>(res));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load lesson');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOne(); }, [fetchOne]);

  const updateLesson = useCallback(async (patch: Partial<Lesson>) => {
    const res = await apiClient.put(`/lessons/${id}`, patch);
    const updated = unwrapResponse<Lesson>(res);
    setLesson(updated);
    return updated;
  }, [id]);

  const patchStatus = useCallback(async (status: LessonStatus) => {
    const res = await apiClient.patch(`/lessons/${id}/status`, { status });
    const updated = unwrapResponse<Lesson>(res);
    setLesson(updated);
    return updated;
  }, [id]);

  const addMaterial = useCallback(async (payload: Record<string, unknown>) => {
    const res = await apiClient.post(`/lessons/${id}/materials`, payload);
    await fetchOne();
    return unwrapResponse<LessonMaterial>(res);
  }, [id, fetchOne]);

  const updateMaterial = useCallback(async (mid: string, patch: { title?: string; teacherNotes?: string }) => {
    const res = await apiClient.patch(`/lessons/${id}/materials/${mid}`, patch);
    await fetchOne();
    return unwrapResponse<LessonMaterial>(res);
  }, [id, fetchOne]);

  const moveMaterial = useCallback(async (mid: string, toPhase: LessonPhase, toIndex: number) => {
    await apiClient.patch(`/lessons/${id}/materials/${mid}/move`, { toPhase, toIndex });
    await fetchOne();
  }, [id, fetchOne]);

  const deleteMaterial = useCallback(async (mid: string) => {
    await apiClient.delete(`/lessons/${id}/materials/${mid}`);
    await fetchOne();
  }, [id, fetchOne]);

  const regenerateMaterial = useCallback(async (mid: string, payload?: Record<string, unknown>) => {
    const res = await apiClient.post(`/lessons/${id}/materials/${mid}/regenerate`, payload ?? {});
    await fetchOne();
    return unwrapResponse<LessonMaterial>(res);
  }, [id, fetchOne]);

  return { lesson, loading, error, refetch: fetchOne, updateLesson, patchStatus, addMaterial, updateMaterial, moveMaterial, deleteMaterial, regenerateMaterial };
}
