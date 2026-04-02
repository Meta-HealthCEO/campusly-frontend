import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, mapId, unwrapResponse } from '@/lib/api-helpers';
import type { Subject, Grade } from '@/types';
import type { Quiz } from '@/components/learning/types';

interface AcademicFiltersResult {
  subjects: Subject[];
  grades: Grade[];
  loading: boolean;
}

/** Fetch subjects and grades for filter dropdowns. */
export function useAcademicFilters(): AcademicFiltersResult {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiClient.get('/academic/subjects'),
      apiClient.get('/academic/grades'),
    ]).then(([subRes, gradeRes]) => {
      if (subRes.status === 'fulfilled') {
        const arr = unwrapList<Record<string, unknown>>(subRes.value);
        setSubjects(arr.map(mapId) as unknown as Subject[]);
      }
      if (gradeRes.status === 'fulfilled') {
        const arr = unwrapList<Record<string, unknown>>(gradeRes.value);
        setGrades(arr.map(mapId) as unknown as Grade[]);
      }
      setLoading(false);
    });
  }, []);

  return { subjects, grades, loading };
}

/** Fetch a full quiz by ID (with questions). */
export function useFetchQuiz(): {
  fetchFullQuiz: (quizId: string) => Promise<Quiz>;
} {
  const fetchFullQuiz = useCallback(async (quizId: string): Promise<Quiz> => {
    const res = await apiClient.get(`/learning/quizzes/${quizId}`);
    const raw = unwrapResponse(res);
    return { ...raw, id: (raw._id as string) ?? (raw.id as string) } as unknown as Quiz;
  }, []);

  return { fetchFullQuiz };
}
