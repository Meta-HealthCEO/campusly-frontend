import { useEffect, useState } from 'react';
import type { AxiosResponse } from 'axios';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

export interface QuestionLite {
  _id: string;
  stem: string;
  marks: number;
  difficulty?: number;
}

interface UseQuestionBankLibraryParams {
  subjectId: string;
  gradeId?: string;
  q?: string;
}

interface UseQuestionBankLibraryResult {
  questions: QuestionLite[];
  loading: boolean;
}

/**
 * Lightweight question-bank listing hook for the lesson-plan
 * ExercisePicker.
 *
 * Fetches approved questions filtered by subject (and optional grade +
 * text search) from the backend Question Bank module
 * (`GET /question-bank/questions?subjectId&gradeId&search`). The backend
 * wraps the response as `{ questions, total, page, limit }`; only the
 * `questions` array is surfaced.
 *
 * Intentionally independent of `useQuestionBank` to keep the picker
 * decoupled from the full Question Bank page's mutation-heavy state.
 */
export function useQuestionBankLibrary(
  params: UseQuestionBankLibraryParams,
): UseQuestionBankLibraryResult {
  const { subjectId, gradeId, q } = params;
  const [questions, setQuestions] = useState<QuestionLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subjectId) {
      setQuestions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const query: Record<string, string | number> = {
      subjectId,
      limit: 50,
    };
    if (gradeId) query.gradeId = gradeId;
    if (q && q.trim()) query.search = q.trim();

    apiClient
      .get('/question-bank/questions', { params: query })
      .then((res: AxiosResponse) => {
        if (cancelled) return;
        setQuestions(unwrapList<QuestionLite>(res, 'questions'));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load question bank library', err);
        setQuestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [subjectId, gradeId, q]);

  return { questions, loading };
}
