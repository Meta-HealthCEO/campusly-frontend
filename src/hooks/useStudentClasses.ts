import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

export interface StudentClass {
  id: string;
  name: string;
  classroomCode: string;
  isHomeroom: boolean;
  grade: { id: string; name: string; level?: number };
  subject?: { id: string; name: string; code?: string } | null;
  teacher: { id: string; firstName: string; lastName: string };
}

interface MyClassesResponse {
  homeroom: StudentClass | null;
  subjectClasses: StudentClass[];
}

interface UseStudentClassesResult {
  homeroom: StudentClass | null;
  subjectClasses: StudentClass[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useStudentClasses(): UseStudentClassesResult {
  const [homeroom, setHomeroom] = useState<StudentClass | null>(null);
  const [subjectClasses, setSubjectClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await apiClient.get('/students/me/classes');
      const data = unwrapResponse<MyClassesResponse>(res);
      setHomeroom(data.homeroom ?? null);
      setSubjectClasses(Array.isArray(data.subjectClasses) ? data.subjectClasses : []);
    } catch (err: unknown) {
      console.error('Failed to load student classes', err);
      setHomeroom(null);
      setSubjectClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { homeroom, subjectClasses, loading, refresh: load };
}
