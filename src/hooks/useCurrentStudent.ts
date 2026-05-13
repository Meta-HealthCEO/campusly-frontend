import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Student } from '@/types';

interface CurrentStudentResult {
  student: Student | null;
  loading: boolean;
}

export function useCurrentStudent(): CurrentStudentResult {
  const { user } = useAuthStore();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setStudent(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    async function resolve() {
      try {
        const res = await apiClient.get('/students/me');
        const match = unwrapResponse<Student>(res);
        setStudent({ ...match, id: (match as unknown as { _id?: string })._id ?? match.id });
      } catch {
        setStudent(null);
        console.error('Failed to resolve current student');
      } finally {
        setLoading(false);
      }
    }

    resolve();
  }, [user]);

  return { student, loading };
}
