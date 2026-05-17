import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type {
  Lesson,
  LessonMaterial,
  LessonPhase,
  UpdateAssignmentPayload,
} from '@/types/lesson';

function toastError(err: unknown, fallback: string): void {
  toast.error(err instanceof Error ? err.message : fallback);
}

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
    try {
      const res = await apiClient.put(`/lessons/${id}`, patch);
      const updated = unwrapResponse<Lesson>(res);
      setLesson(updated);
      return updated;
    } catch (err: unknown) {
      toastError(err, 'Failed to update lesson');
      throw err;
    }
  }, [id]);

  const publish = useCallback(async () => {
    try {
      const res = await apiClient.post(`/lessons/${id}/publish`);
      const updated = unwrapResponse<Lesson>(res);
      setLesson(updated);
      return updated;
    } catch (err: unknown) {
      toastError(err, 'Failed to publish lesson');
      throw err;
    }
  }, [id]);

  const unpublish = useCallback(async () => {
    try {
      const res = await apiClient.post(`/lessons/${id}/unpublish`);
      const updated = unwrapResponse<Lesson>(res);
      setLesson(updated);
      return updated;
    } catch (err: unknown) {
      toastError(err, 'Failed to unpublish lesson');
      throw err;
    }
  }, [id]);

  const addMaterial = useCallback(async (payload: Record<string, unknown>) => {
    try {
      const res = await apiClient.post(`/lessons/${id}/materials`, payload);
      await fetchOne();
      return unwrapResponse<LessonMaterial>(res);
    } catch (err: unknown) {
      toastError(err, 'Failed to add material');
      throw err;
    }
  }, [id, fetchOne]);

  const updateMaterial = useCallback(async (mid: string, patch: { title?: string; teacherNotes?: string }) => {
    try {
      const res = await apiClient.patch(`/lessons/${id}/materials/${mid}`, patch);
      await fetchOne();
      return unwrapResponse<LessonMaterial>(res);
    } catch (err: unknown) {
      toastError(err, 'Failed to update material');
      throw err;
    }
  }, [id, fetchOne]);

  const moveMaterial = useCallback(async (mid: string, toPhase: LessonPhase, toIndex: number) => {
    try {
      await apiClient.patch(`/lessons/${id}/materials/${mid}/move`, { toPhase, toIndex });
      await fetchOne();
    } catch (err: unknown) {
      toastError(err, 'Failed to move material');
      throw err;
    }
  }, [id, fetchOne]);

  const deleteMaterial = useCallback(async (mid: string) => {
    try {
      await apiClient.delete(`/lessons/${id}/materials/${mid}`);
      await fetchOne();
    } catch (err: unknown) {
      toastError(err, 'Failed to delete material');
      throw err;
    }
  }, [id, fetchOne]);

  const regenerateMaterial = useCallback(async (mid: string, payload?: Record<string, unknown>) => {
    try {
      const res = await apiClient.post(`/lessons/${id}/materials/${mid}/regenerate`, payload ?? {});
      await fetchOne();
      return unwrapResponse<LessonMaterial>(res);
    } catch (err: unknown) {
      toastError(err, 'Failed to regenerate material');
      throw err;
    }
  }, [id, fetchOne]);

  const generateAllPlaceholders = useCallback(async () => {
    try {
      const res = await apiClient.post(
        `/lessons/${id}/materials/generate-all`,
      );
      await fetchOne();
      return unwrapResponse<{
        total: number;
        succeeded: number;
        failed: Array<{ materialId: string; title: string; error: string }>;
      }>(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate materials';
      toast.error(msg);
      throw err;
    }
  }, [id, fetchOne]);

  // ── Assignment mutations ─────────────────────────────────────────────────
  // The pack itself is curriculum-scoped; classes are attached as a separate
  // schedule. Each mutation refetches so the workspace UI stays in sync with
  // the server's authoritative populated shape.

  const assignClass = useCallback(async (classId: string, scheduledDate: string) => {
    try {
      const res = await apiClient.post(`/lessons/${id}/assignments`, {
        classId,
        scheduledDate,
      });
      const updated = unwrapResponse<Lesson>(res);
      setLesson(updated);
      return updated;
    } catch (err: unknown) {
      toastError(err, 'Failed to assign class');
      throw err;
    }
  }, [id]);

  const unassignClass = useCallback(async (classId: string) => {
    try {
      const res = await apiClient.delete(`/lessons/${id}/assignments/${classId}`);
      const updated = unwrapResponse<Lesson>(res);
      setLesson(updated);
      return updated;
    } catch (err: unknown) {
      toastError(err, 'Failed to remove class');
      throw err;
    }
  }, [id]);

  const updateAssignment = useCallback(async (
    classId: string,
    patch: UpdateAssignmentPayload,
  ) => {
    try {
      const res = await apiClient.patch(`/lessons/${id}/assignments/${classId}`, patch);
      const updated = unwrapResponse<Lesson>(res);
      setLesson(updated);
      return updated;
    } catch (err: unknown) {
      toastError(err, 'Failed to update assignment');
      throw err;
    }
  }, [id]);

  return {
    lesson,
    loading,
    error,
    refetch: fetchOne,
    updateLesson,
    publish,
    unpublish,
    addMaterial,
    updateMaterial,
    moveMaterial,
    deleteMaterial,
    regenerateMaterial,
    generateAllPlaceholders,
    assignClass,
    unassignClass,
    updateAssignment,
  };
}
