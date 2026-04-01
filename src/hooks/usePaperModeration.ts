import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PaperModeration, ModerationStatus } from '@/types';

interface UsePaperModerationReturn {
  moderations: PaperModeration[];
  currentModeration: PaperModeration | null;
  loading: boolean;
  submitting: boolean;
  fetchQueue: () => Promise<void>;
  fetchStatus: (paperId: string) => Promise<void>;
  submitForModeration: (paperId: string) => Promise<void>;
  reviewPaper: (
    paperId: string,
    status: Extract<ModerationStatus, 'approved' | 'changes_requested'>,
    comments: string,
  ) => Promise<void>;
}

export function usePaperModeration(): UsePaperModerationReturn {
  const [moderations, setModerations] = useState<PaperModeration[]>([]);
  const [currentModeration, setCurrentModeration] = useState<PaperModeration | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const user = useAuthStore((s) => s.user);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/teacher-workbench/moderation/queue', {
        params: { schoolId: user?.schoolId },
      });
      const data = unwrapList<PaperModeration>(response);
      setModerations(data);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load moderation queue');
      console.error(msg, err);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  const fetchStatus = useCallback(async (paperId: string) => {
    if (!paperId) return;
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/teacher-workbench/moderation/${paperId}`,
      );
      const data = unwrapResponse<PaperModeration>(response);
      setCurrentModeration(data);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load moderation status');
      console.error(msg, err);
      setCurrentModeration(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const submitForModeration = useCallback(async (paperId: string) => {
    setSubmitting(true);
    try {
      await apiClient.post(
        `/teacher-workbench/moderation/submit/${paperId}`,
      );
      toast.success('Paper submitted for moderation');
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to submit for moderation');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const reviewPaper = useCallback(
    async (
      paperId: string,
      status: Extract<ModerationStatus, 'approved' | 'changes_requested'>,
      comments: string,
    ) => {
      setSubmitting(true);
      try {
        await apiClient.post(
          `/teacher-workbench/moderation/${paperId}/review`,
          { status, comments },
        );
        const label = status === 'approved' ? 'approved' : 'changes requested';
        toast.success(`Paper ${label} successfully`);
        await fetchQueue();
      } catch (err: unknown) {
        const msg = extractErrorMessage(err, 'Failed to submit review');
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [fetchQueue],
  );

  return {
    moderations,
    currentModeration,
    loading,
    submitting,
    fetchQueue,
    fetchStatus,
    submitForModeration,
    reviewPaper,
  };
}
