'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { StructuredHomeworkSubmission } from '@/types/homework';

export function useTeacherHomeworkSubmissions(homeworkId: string): {
  submissions: StructuredHomeworkSubmission[];
  loading: boolean;
  refetch: () => Promise<void>;
  regradeSubmission: (submissionId: string) => Promise<StructuredHomeworkSubmission | null>;
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
        const res = await apiClient.post(`/homework/${homeworkId}/regrade`, {});
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
    [homeworkId],
  );

  return { submissions, loading, refetch, regradeSubmission };
}
