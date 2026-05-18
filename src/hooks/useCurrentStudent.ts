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

function populatedObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function normaliseStudent(match: Student): Student {
  const record = match as unknown as Record<string, unknown>;
  const grade = populatedObject(record.grade) ?? populatedObject(record.gradeId);
  const classRecord = populatedObject(record.class) ?? populatedObject(record.classId);

  return {
    ...match,
    id: (record._id as string | undefined) ?? (record.id as string | undefined) ?? match.id,
    ...(grade ? { grade: grade as unknown as Student['grade'] } : {}),
    ...(classRecord ? { class: classRecord as unknown as Student['class'] } : {}),
  };
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
        setStudent(normaliseStudent(match));
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
