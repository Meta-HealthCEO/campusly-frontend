import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { ReportComment, ReportCommentPayload } from '@/types';

function mapComment(r: Record<string, unknown>): ReportComment {
  return {
    ...(r as unknown as ReportComment),
    id: ((r._id ?? r.id) as string) ?? '',
    finalText: (r.finalText as string) ?? (r.comment as string) ?? '',
    comment: (r.finalText as string) ?? (r.comment as string) ?? '',
    wasEdited: Boolean(r.wasEdited),
  };
}

export function useReportComments() {
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const generateComments = useCallback(async (payload: ReportCommentPayload) => {
    setGenerating(true);
    try {
      const res = await apiClient.post('/ai-tutor/report-comments', {
        ...payload,
        term: typeof payload.term === 'string' ? parseInt(payload.term, 10) : payload.term,
      });
      const raw = unwrapResponse(res);
      const items = Array.isArray(raw)
        ? (raw as Record<string, unknown>[]).map(mapComment)
        : ((raw as Record<string, unknown>).comments as Record<string, unknown>[] ?? []).map(mapComment);
      setComments(items);
      toast.success('Report comments generated!');
      return items;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to generate report comments'));
      return [];
    } finally {
      setGenerating(false);
    }
  }, []);

  const loadComments = useCallback(async (filters: {
    classId?: string;
    subjectId?: string;
    term?: number;
  }): Promise<ReportComment[]> => {
    setLoadingComments(true);
    try {
      const response = await apiClient.get('/ai-tutor/report-comments', { params: filters });
      const raw = unwrapList<Record<string, unknown>>(response);
      const mapped = raw.map(mapComment);
      setComments(mapped);
      return mapped;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to load saved comments'));
      return [];
    } finally {
      setLoadingComments(false);
    }
  }, []);

  const updateComment = useCallback(async (id: string, finalText: string) => {
    try {
      const response = await apiClient.put(`/ai-tutor/report-comments/${id}`, { finalText });
      const raw = unwrapResponse<Record<string, unknown>>(response);
      const updated = mapComment(raw);
      setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save edit'));
      return null;
    }
  }, []);

  const updateCommentLocal = useCallback((studentId: string, text: string) => {
    setComments((prev) =>
      prev.map((c) => (c.studentId === studentId ? { ...c, comment: text, finalText: text } : c)),
    );
  }, []);

  const regenerateComment = useCallback(async (id: string) => {
    try {
      const response = await apiClient.post(`/ai-tutor/report-comments/${id}/regenerate`);
      const raw = unwrapResponse<Record<string, unknown>>(response);
      const regen = mapComment(raw);
      setComments((prev) => prev.map((c) => (c.id === id ? regen : c)));
      toast.success('Comment regenerated');
      return regen;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to regenerate comment'));
      return null;
    }
  }, []);

  const deleteComment = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/ai-tutor/report-comments/${id}`);
      setComments((prev) => prev.filter((c) => c.id !== id));
      toast.success('Comment deleted');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete comment'));
      return false;
    }
  }, []);

  const clearComments = useCallback(() => {
    setComments([]);
  }, []);

  return {
    comments,
    generating,
    loadingComments,
    generateComments,
    loadComments,
    updateComment,
    updateCommentLocal,
    regenerateComment,
    deleteComment,
    clearComments,
  };
}
