import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  TextbookItem,
  TextbookFilters,
  CreateTextbookPayload,
  UpdateTextbookPayload,
  AddChapterPayload,
  UpdateChapterPayload,
  AddResourceToChapterPayload,
  ReorderChaptersPayload,
  ChapterItem,
  ContentResourceItem,
} from '@/types';

const BASE = '/textbooks';

export function useTextbooks() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const [textbooks, setTextbooks] = useState<TextbookItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  /* ── List ─────────────────────────────────────────────────── */

  const fetchTextbooks = useCallback(
    async (filters?: TextbookFilters) => {
      if (!schoolId) return;
      setLoading(true);
      try {
        const params: Record<string, unknown> = { ...filters };
        const response = await apiClient.get(BASE, { params });
        const raw = response.data.data ?? response.data;
        if (Array.isArray(raw)) {
          setTextbooks(raw as TextbookItem[]);
          setTotal(raw.length);
        } else if (typeof raw === 'object' && raw !== null) {
          const obj = raw as Record<string, unknown>;
          const arr = Array.isArray(obj.textbooks)
            ? (obj.textbooks as TextbookItem[])
            : unwrapList<TextbookItem>(response);
          setTextbooks(arr);
          setTotal(typeof obj.total === 'number' ? obj.total : arr.length);
        }
      } catch (err: unknown) {
        console.error('Failed to load textbooks:', extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [schoolId],
  );

  /* ── Single ───────────────────────────────────────────────── */

  const getTextbook = useCallback(
    async (id: string): Promise<TextbookItem | null> => {
      try {
        const response = await apiClient.get(`${BASE}/${id}`);
        return unwrapResponse<TextbookItem>(response);
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to load textbook'));
        return null;
      }
    },
    [],
  );

  /* ── CRUD ─────────────────────────────────────────────────── */

  const createTextbook = useCallback(
    async (data: CreateTextbookPayload): Promise<TextbookItem | null> => {
      try {
        const response = await apiClient.post(BASE, data);
        toast.success('Textbook created');
        return unwrapResponse<TextbookItem>(response);
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to create textbook'));
        return null;
      }
    },
    [],
  );

  const updateTextbook = useCallback(
    async (id: string, data: UpdateTextbookPayload): Promise<TextbookItem | null> => {
      try {
        const response = await apiClient.put(`${BASE}/${id}`, data);
        toast.success('Textbook updated');
        return unwrapResponse<TextbookItem>(response);
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to update textbook'));
        return null;
      }
    },
    [],
  );

  const deleteTextbook = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await apiClient.delete(`${BASE}/${id}`);
        toast.success('Textbook deleted');
        return true;
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to delete textbook'));
        return false;
      }
    },
    [],
  );

  /* ── Chapters ─────────────────────────────────────────────── */

  const addChapter = useCallback(
    async (textbookId: string, data: AddChapterPayload): Promise<ChapterItem | null> => {
      try {
        const response = await apiClient.post(`${BASE}/${textbookId}/chapters`, data);
        toast.success('Chapter added');
        return unwrapResponse<ChapterItem>(response);
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to add chapter'));
        return null;
      }
    },
    [],
  );

  const updateChapter = useCallback(
    async (
      textbookId: string,
      chapterId: string,
      data: UpdateChapterPayload,
    ): Promise<ChapterItem | null> => {
      try {
        const response = await apiClient.put(
          `${BASE}/${textbookId}/chapters/${chapterId}`,
          data,
        );
        toast.success('Chapter updated');
        return unwrapResponse<ChapterItem>(response);
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to update chapter'));
        return null;
      }
    },
    [],
  );

  const removeChapter = useCallback(
    async (textbookId: string, chapterId: string): Promise<boolean> => {
      try {
        await apiClient.delete(`${BASE}/${textbookId}/chapters/${chapterId}`);
        toast.success('Chapter removed');
        return true;
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to remove chapter'));
        return false;
      }
    },
    [],
  );

  /* ── Chapter Resources ────────────────────────────────────── */

  const addResourceToChapter = useCallback(
    async (
      textbookId: string,
      chapterId: string,
      data: AddResourceToChapterPayload,
    ): Promise<boolean> => {
      try {
        await apiClient.post(
          `${BASE}/${textbookId}/chapters/${chapterId}/resources`,
          data,
        );
        toast.success('Resource added to chapter');
        return true;
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to add resource'));
        return false;
      }
    },
    [],
  );

  const removeResourceFromChapter = useCallback(
    async (
      textbookId: string,
      chapterId: string,
      resourceId: string,
    ): Promise<boolean> => {
      try {
        await apiClient.delete(
          `${BASE}/${textbookId}/chapters/${chapterId}/resources/${resourceId}`,
        );
        toast.success('Resource removed from chapter');
        return true;
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to remove resource'));
        return false;
      }
    },
    [],
  );

  /* ── Reorder + Publish ────────────────────────────────────── */

  const reorderChapters = useCallback(
    async (textbookId: string, data: ReorderChaptersPayload): Promise<boolean> => {
      try {
        await apiClient.put(`${BASE}/${textbookId}/chapters/reorder`, data);
        toast.success('Chapters reordered');
        return true;
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to reorder chapters'));
        return false;
      }
    },
    [],
  );

  const publishTextbook = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await apiClient.post(`${BASE}/${id}/publish`);
        toast.success('Textbook published');
        return true;
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to publish textbook'));
        return false;
      }
    },
    [],
  );

  /* ── Resource Search (for adding resources to chapters) ──── */

  const fetchAvailableResources = useCallback(
    async (
      subjectId: string,
      gradeId: string,
      search?: string,
    ): Promise<ContentResourceItem[]> => {
      try {
        const params: Record<string, string | number> = {
          status: 'approved',
          subjectId,
          gradeId,
          limit: 20,
        };
        if (search) params.search = search;
        const response = await apiClient.get('/content-library/resources', { params });
        const raw = response.data.data ?? response.data;
        if (Array.isArray(raw)) return raw as ContentResourceItem[];
        const obj = raw as Record<string, unknown>;
        return Array.isArray(obj.resources)
          ? (obj.resources as ContentResourceItem[])
          : unwrapList<ContentResourceItem>(response);
      } catch (err: unknown) {
        console.error('Failed to search resources', err);
        return [];
      }
    },
    [],
  );

  return {
    textbooks,
    total,
    loading,
    fetchTextbooks,
    getTextbook,
    createTextbook,
    updateTextbook,
    deleteTextbook,
    addChapter,
    updateChapter,
    removeChapter,
    addResourceToChapter,
    removeResourceFromChapter,
    reorderChapters,
    publishTextbook,
    fetchAvailableResources,
  };
}
