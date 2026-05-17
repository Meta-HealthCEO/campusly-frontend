'use client';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';

export interface QuizSummary {
  _id: string;
  title: string;
  totalPoints: number;
  subjectId: string;
  classId: string;
  questions?: Array<unknown>;
}

export function useTeacherQuizzes(filters?: {
  subjectId?: string;
  classId?: string;
}): {
  quizzes: QuizSummary[];
  loading: boolean;
} {
  const { user } = useAuthStore();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const params: Record<string, string> = { status: 'published' };
    if (filters?.subjectId) params.subjectId = filters.subjectId;
    if (filters?.classId) params.classId = filters.classId;
    params.teacherId = user.id;

    const controller = new AbortController();
    apiClient
      .get('/learning/quizzes', { params, signal: controller.signal })
      .then((res) => setQuizzes(unwrapList<QuizSummary>(res)))
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        console.error('Failed to load quizzes', err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [filters?.subjectId, filters?.classId, user?.id]);

  return { quizzes: user?.id ? quizzes : [], loading: user?.id ? loading : false };
}
