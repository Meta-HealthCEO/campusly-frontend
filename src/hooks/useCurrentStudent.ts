import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Student, User } from '@/types';

interface CurrentStudentResult {
  student: Student | null;
  loading: boolean;
}

function matchUserId(s: Student, userId: string): boolean {
  if (typeof s.userId === 'string') return s.userId === userId;
  if (typeof s.userId === 'object' && s.userId !== null) {
    const u = s.userId as User & { _id?: string };
    return u._id === userId || u.id === userId;
  }
  return false;
}

export function useCurrentStudent(): CurrentStudentResult {
  const { user } = useAuthStore();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    async function resolve() {
      try {
        const res = await apiClient.get('/students');
        const raw = res.data.data ?? res.data;
        const arr: Student[] = Array.isArray(raw) ? raw : raw.students ?? raw.data ?? [];
        const match = arr.find((s) => matchUserId(s, user!.id));
        if (match) {
          setStudent({ ...match, id: (match as unknown as { _id?: string })._id ?? match.id });
        }
      } catch {
        console.error('Failed to resolve current student');
      } finally {
        setLoading(false);
      }
    }

    resolve();
  }, [user]);

  return { student, loading };
}
