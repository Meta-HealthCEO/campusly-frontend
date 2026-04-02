import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  PracticeAttempt,
  GeneratePracticePayload,
  SubmitPracticePayload,
} from '@/types';

export function useAIPractice() {
  const [currentAttempt, setCurrentAttempt] = useState<PracticeAttempt | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const generatePractice = useCallback(async (payload: GeneratePracticePayload) => {
    setGenerating(true);
    try {
      const res = await apiClient.post('/ai-tutor/practice', payload);
      const raw = unwrapResponse(res);
      const attempt = {
        ...(raw as Record<string, unknown>),
        id: (raw._id as string) ?? (raw.id as string),
      } as unknown as PracticeAttempt;
      setCurrentAttempt(attempt);
      toast.success('Practice questions generated!');
      return attempt;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to generate practice'));
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const submitPractice = useCallback(async (payload: SubmitPracticePayload) => {
    setSubmitting(true);
    try {
      const res = await apiClient.post('/ai-tutor/practice/submit', payload);
      const raw = unwrapResponse(res);
      const attempt = {
        ...(raw as Record<string, unknown>),
        id: (raw._id as string) ?? (raw.id as string),
      } as unknown as PracticeAttempt;
      setCurrentAttempt(attempt);
      toast.success('Practice submitted! Check your results.');
      return attempt;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to submit practice'));
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const resetAttempt = useCallback(() => {
    setCurrentAttempt(null);
  }, []);

  return {
    currentAttempt,
    generating,
    submitting,
    generatePractice,
    submitPractice,
    resetAttempt,
  };
}
