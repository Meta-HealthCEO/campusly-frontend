'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { Quiz, QuizAnswer, QuizAttempt } from '@/components/learning/types';

export type QuizPlayerMode = 'scored' | 'practice';

interface UseQuizPlayerResult {
  quiz: Quiz | null;
  loading: boolean;
  error: boolean;
  submitAttempt: (
    answers: QuizAnswer[],
    startedAt: string,
    timeSpent?: number,
  ) => Promise<QuizAttempt>;
}

function mapQuiz(raw: Record<string, unknown>): Quiz {
  return {
    ...raw,
    id: (raw._id as string) ?? (raw.id as string) ?? '',
  } as unknown as Quiz;
}

function mapAttempt(raw: Record<string, unknown>): QuizAttempt {
  return {
    ...raw,
    id: (raw._id as string) ?? (raw.id as string) ?? '',
  } as unknown as QuizAttempt;
}

/**
 * Loads a quiz for the QuizPlayer wrapper and exposes a submitAttempt
 * function. Uses the `/learning/quizzes/:id` GET endpoint to fetch the
 * full quiz definition and `/learning/quizzes/:id/attempt` POST endpoint
 * to submit answers. In `practice` mode, a `mode: 'practice'` flag is
 * sent so the backend (if it supports it) can skip persisting a scored
 * attempt; backends that ignore the flag still return a usable attempt
 * for the UI's results screen.
 */
export function useQuizPlayer(
  quizId: string,
  mode: QuizPlayerMode,
): UseQuizPlayerResult {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!quizId) {
      setLoading(false);
      setError(true);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    apiClient
      .get(`/learning/quizzes/${quizId}`, { signal: controller.signal })
      .then((res) => {
        const raw = unwrapResponse<Record<string, unknown>>(res);
        setQuiz(mapQuiz(raw));
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        console.error('Failed to load quiz', err);
        setError(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [quizId]);

  const submitAttempt = useCallback(
    async (
      answers: QuizAnswer[],
      startedAt: string,
      timeSpent?: number,
    ): Promise<QuizAttempt> => {
      const payload: Record<string, unknown> = { answers, startedAt, timeSpent };
      if (mode === 'practice') payload.mode = 'practice';
      const res = await apiClient.post(
        `/learning/quizzes/${quizId}/attempt`,
        payload,
      );
      return mapAttempt(unwrapResponse<Record<string, unknown>>(res));
    },
    [quizId, mode],
  );

  return { quiz, loading, error, submitAttempt };
}
