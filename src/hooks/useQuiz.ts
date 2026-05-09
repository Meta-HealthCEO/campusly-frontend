'use client';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'short_answer' | 'matching';
  options: QuizOption[];
  correctAnswer: string;
  points: number;
}

export interface QuizDetail {
  _id: string;
  title: string;
  questions: QuizQuestion[];
  totalPoints: number;
  shuffleQuestions?: boolean;
}

export function useQuiz(quizId: string | null | undefined): {
  quiz: QuizDetail | null;
  loading: boolean;
} {
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState(!!quizId);

  useEffect(() => {
    if (!quizId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    apiClient
      .get(`/learning/quizzes/${quizId}`, { signal: controller.signal })
      .then((res) => setQuiz(unwrapResponse<QuizDetail>(res)))
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        console.error('Failed to load quiz', err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [quizId]);

  return { quiz, loading };
}
