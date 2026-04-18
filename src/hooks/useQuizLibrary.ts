import { useEffect, useState } from 'react';
import type { AxiosResponse } from 'axios';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

export interface QuizLite {
  _id: string;
  title: string;
  totalPoints: number;
}

interface UseQuizLibraryParams {
  classId: string;
  subjectId: string;
}

interface UseQuizLibraryResult {
  quizzes: QuizLite[];
  loading: boolean;
}

/**
 * Lightweight quiz listing hook for the lesson-plan QuizPicker.
 *
 * Fetches quizzes filtered by class + subject from the backend
 * Learning module (`GET /learning/quizzes?classId&subjectId`).
 * Intentionally independent of `useLearningApi` / the learning Zustand
 * store to keep the picker decoupled from the Learning page's state.
 */
export function useQuizLibrary(
  params: UseQuizLibraryParams,
): UseQuizLibraryResult {
  const { classId, subjectId } = params;
  const [quizzes, setQuizzes] = useState<QuizLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId || !subjectId) {
      setQuizzes([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiClient
      .get('/learning/quizzes', { params: { classId, subjectId } })
      .then((res: AxiosResponse) => {
        if (cancelled) return;
        setQuizzes(unwrapList<QuizLite>(res));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load quiz library', err);
        setQuizzes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classId, subjectId]);

  return { quizzes, loading };
}
