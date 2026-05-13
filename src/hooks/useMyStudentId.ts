'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { unwrapResponse } from '@/lib/api-helpers';

interface StudentRecord {
  _id: string;
  id?: string;
}

/**
 * Resolves the current user's Student document id.
 * Returns null while loading or if no student record exists.
 */
export function useMyStudentId(): { studentId: string | null; loading: boolean } {
  const user = useAuthStore((s) => s.user);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !user?.schoolId) {
      setStudentId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/students/me');
        const match = unwrapResponse<StudentRecord>(res);
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
