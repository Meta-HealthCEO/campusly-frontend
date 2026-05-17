import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  PracticeHistoryItem,
  Recommendation,
  SubjectMastery,
} from '@/types';

interface PracticeHistoryResponse {
  attempts: PracticeHistoryItem[];
  total: number;
}

/**
 * Fetches a student's per-subject mastery snapshot. Combines practice attempts,
 * homework results, and teacher-graded marks into a single weighted score.
 */
export function useStudentMastery() {
  const [mastery, setMastery] = useState<SubjectMastery[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/ai-tutor/mastery');
      setMastery(unwrapList<SubjectMastery>(res));
    } catch (err: unknown) {
      console.error('Failed to load mastery', err);
      toast.error(extractErrorMessage(err, 'Failed to load mastery'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { mastery, loading, refresh };
}

/** Adaptive "what to work on next" suggestions. */
export function useStudentRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/ai-tutor/recommendations');
      setRecommendations(unwrapList<Recommendation>(res));
    } catch (err: unknown) {
      console.error('Failed to load recommendations', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { recommendations, loading, refresh };
}

/** Paginated history of past practice attempts. */
export function usePracticeHistory(initialPage = 1, initialLimit = 20) {
  const [history, setHistory] = useState<PracticeHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/ai-tutor/practice/history', {
        params: { page, limit },
      });
      const data = unwrapResponse<PracticeHistoryResponse>(res);
      setHistory(data.attempts ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      console.error('Failed to load practice history', err);
      toast.error(extractErrorMessage(err, 'Failed to load practice history'));
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { history, total, page, limit, setPage, loading, refresh };
}
