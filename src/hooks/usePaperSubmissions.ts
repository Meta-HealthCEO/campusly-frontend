'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { SubmissionSummary } from '@/types/papers';

export function usePaperSubmissions(paperId: string | undefined): {
  submissions: SubmissionSummary[];
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!paperId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/question-bank/papers/${paperId}/submissions`);
      setSubmissions(unwrapResponse<SubmissionSummary[]>(res));
    } catch (err: unknown) {
      console.error('Failed to load submissions', err);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [paperId]);

  useEffect(() => { void refetch(); }, [refetch]);

  return { submissions, loading, refetch };
}
