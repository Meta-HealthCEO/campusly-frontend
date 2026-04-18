'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { unwrapList } from '@/lib/api-helpers';

interface StudentRecord {
  _id: string;
  id?: string;
  userId?: string;
}

/**
 * Resolves the current user's Student document _id by looking up /students
 * where student.userId === user.id. Returns null while loading or if no match.
 */
export function useMyStudentId(): { studentId: string | null; loading: boolean } {
  const user = useAuthStore((s) => s.user);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !user?.schoolId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/students', { params: { schoolId: user.schoolId } });
        const list = unwrapList<StudentRecord>(res);
        const match = list.find((s) => s.userId === user.id);
        if (!cancelled) {
          setStudentId(match?._id ?? match?.id ?? null);
        }
      } catch {
        if (!cancelled) setStudentId(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.schoolId]);

  return { studentId, loading };
}
