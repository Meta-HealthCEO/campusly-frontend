import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { StudentLessonDetail } from '@/types';

interface UseStudentLessonResult {
  lesson: StudentLessonDetail | null;
  loading: boolean;
}

export function useStudentLesson(id: string): UseStudentLessonResult {
  const [lesson, setLesson] = useState<StudentLessonDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await apiClient.get(`/student/lessons/${id}`);
        if (!cancelled) setLesson(unwrapResponse<StudentLessonDetail>(response));
      } catch {
        if (!cancelled) setLesson(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id]);

  return { lesson, loading };
}
