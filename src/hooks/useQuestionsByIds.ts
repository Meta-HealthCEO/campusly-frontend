'use client';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { QuestionItem } from '@/types/question-bank';

export function useQuestionsByIds(ids: string[]): {
  questions: QuestionItem[];
  loading: boolean;
} {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(ids.length > 0);

  // Stable key to avoid re-running when a new array ref but same content
  const joinedIds = ids.join(',');

  useEffect(() => {
    if (ids.length === 0) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(
      ids.map((id) =>
        apiClient
          .get(`/question-bank/questions/${id}`)
          .then((res) => unwrapResponse<QuestionItem>(res))
          .catch((err: unknown) => {
            console.error(`Failed to load question ${id}`, err);
            return null;
          }),
      ),
    ).then((results) => {
      if (cancelled) return;
      setQuestions(results.filter((q): q is QuestionItem => q !== null));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedIds]);

  return { questions, loading };
}
