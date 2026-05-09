'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { StructuredHomeworkSubmission } from '@/types/homework';

const POLL_INTERVAL_MS = 3000;

export function useHomeworkSubmission(submissionId: string | null): {
  submission: StructuredHomeworkSubmission | null;
  loading: boolean;
  polling: boolean;
  refetch: () => Promise<void>;
} {
  const [submission, setSubmission] = useState<StructuredHomeworkSubmission | null>(null);
  const [loading, setLoading] = useState(!!submissionId);
  const [polling, setPolling] = useState(false);
  const cancelledRef = useRef(false);

  const fetchOnce = useCallback(async (): Promise<void> => {
    if (!submissionId) return;
    try {
      const res = await apiClient.get(`/homework/submissions/${submissionId}`);
      const data = unwrapResponse<StructuredHomeworkSubmission>(res);
      if (!cancelledRef.current) setSubmission(data);
    } catch (err: unknown) {
      console.error('Failed to load submission', err);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    if (!submissionId) {
      setSubmission(null);
      setLoading(false);
      return;
    }
    cancelledRef.current = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const poll = async (): Promise<void> => {
      if (cancelledRef.current) return;
      try {
        const res = await apiClient.get(`/homework/submissions/${submissionId}`);
        const data = unwrapResponse<StructuredHomeworkSubmission>(res);
        if (cancelledRef.current) return;
        setSubmission(data);
        setLoading(false);
        if (data.gradingStatus === 'pending') {
          setPolling(true);
          timerId = setTimeout(() => void poll(), POLL_INTERVAL_MS);
        } else {
          setPolling(false);
        }
      } catch (err: unknown) {
        console.error('Submission poll failed', err);
        setLoading(false);
      }
    };
    void poll();

    return () => {
      cancelledRef.current = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [submissionId]);

  return { submission, loading, polling, refetch: fetchOnce };
}
