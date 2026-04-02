import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { ReportComment, ReportCommentPayload } from '@/types';

export function useReportComments() {
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [generating, setGenerating] = useState(false);

  const generateComments = useCallback(async (payload: ReportCommentPayload) => {
    setGenerating(true);
    try {
      const res = await apiClient.post('/ai-tutor/report-comments', payload);
      const raw = unwrapResponse(res);
      const items = Array.isArray(raw)
        ? (raw as ReportComment[])
        : (raw as Record<string, unknown>).comments as ReportComment[] ?? [];
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

  const updateComment = useCallback((studentId: string, comment: string) => {
    setComments((prev) =>
      prev.map((c) => (c.studentId === studentId ? { ...c, comment } : c)),
    );
  }, []);

  const clearComments = useCallback(() => {
    setComments([]);
  }, []);

  return {
    comments,
    generating,
    generateComments,
    updateComment,
    clearComments,
  };
}
