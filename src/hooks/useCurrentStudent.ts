import { useState, useEffect } from 'react';
import { isAxiosError } from 'axios';
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
      } catch (err: unknown) {
        setStudent(null);
        // 404 means this user has no Student record yet — an expected state
        // (e.g. user account exists but admin hasn't linked a student profile).
        // Callers handle `student === null` gracefully; no need to log.
        const status = isAxiosError(err) ? err.response?.status : undefined;
        if (status !== 404) {
          console.warn('useCurrentStudent: lookup failed', { status, err });
        }
      } finally {
        setLoading(false);
      }
    }

    resolve();
  }, [user]);

  return { student, loading };
}
