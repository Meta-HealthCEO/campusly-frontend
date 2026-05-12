import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { StudentLessonSummary, StudentLessonListFilters } from '@/types';

interface UseStudentLessonsResult {
  lessons: StudentLessonSummary[];
  loading: boolean;
  refresh: (filters?: StudentLessonListFilters) => Promise<void>;
}

export function useStudentLessons(initial?: StudentLessonListFilters): UseStudentLessonsResult {
  const [lessons, setLessons] = useState<StudentLessonSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (filters?: StudentLessonListFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const f = filters ?? initial ?? {};
      if (f.subjectId) params.set('subjectId', f.subjectId);
      if (f.status) params.set('status', f.status);
      if (f.search) params.set('search', f.search);
      const qs = params.toString();
      const response = await apiClient.get(`/student/lessons${qs ? `?${qs}` : ''}`);
      setLessons(unwrapList<StudentLessonSummary>(response));
    } catch {
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }, [initial]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { lessons, loading, refresh };
}
