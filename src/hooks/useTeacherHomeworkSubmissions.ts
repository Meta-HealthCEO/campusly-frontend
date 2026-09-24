'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapList, unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { StructuredHomeworkSubmission } from '@/types/homework';

export function useTeacherHomeworkSubmissions(homeworkId: string): {
  submissions: StructuredHomeworkSubmission[];
  loading: boolean;
  refetch: () => Promise<void>;
  regradeSubmission: (submissionId: string) => Promise<StructuredHomeworkSubmission | null>;
  gradeSubmission: (submissionId: string, mark: number, feedback?: string) => Promise<boolean>;
} {
  const [submissions, setSubmissions] = useState<StructuredHomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async (): Promise<void> => {
    try {
      const res = await apiClient.get(`/homework/${homeworkId}/submissions`);
      setSubmissions(unwrapList<StructuredHomeworkSubmission>(res));
    } catch (err: unknown) {
      console.error('Failed to load submissions', err);
    } finally {
      setLoading(false);
    }
  }, [homeworkId]);

  useEffect(() => {
    if (!homeworkId) return;
    void refetch();
  }, [homeworkId, refetch]);

  const regradeSubmission = useCallback(
    async (submissionId: string): Promise<StructuredHomeworkSubmission | null> => {
      try {
        const res = await apiClient.post(`/homework/submissions/${submissionId}/regrade`, {});
        const fresh = unwrapResponse<StructuredHomeworkSubmission>(res);
        setSubmissions((prev) =>
          prev.map((s) => (s._id === submissionId ? fresh : s)),
        );
        toast.success('Regrade triggered');
        return fresh;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Regrade failed');
        return null;
      }
    },
    [],
  );

  /** A mark the teacher enters by hand; it reaches the gradebook like an auto-mark. */
  const gradeSubmission = useCallback(
    async (submissionId: string, mark: number, feedback?: string): Promise<boolean> => {
      try {
        await apiClient.patch(`/homework/submissions/${submissionId}/grade`, { mark, feedback: feedback || undefined });
        setSubmissions((prev) =>
          prev.map((s) => (s._id === submissionId ? { ...s, mark, feedback, gradingStatus: 'graded' } : s)),
        );
        toast.success('Mark saved');
        return true;
      } catch (err: unknown) {
        console.error('Failed to save mark', err);
        toast.error(extractErrorMessage(err, 'Could not save the mark.'));
        return false;
      }
    },
    [],
  );

  return { submissions, loading, refetch, regradeSubmission, gradeSubmission };
}
