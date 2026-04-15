import { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SubstituteTeacher } from '@/types';

interface PopulatedUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

// Re-export the SubstituteTeacher type as SubstituteRecord for hook callers
export type SubstituteRecord = SubstituteTeacher;

function getTeacherId(
  val: string | PopulatedUser | null | undefined,
): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val._id ?? '';
}

export function useTeacherSubstitutes() {
  const { user } = useAuthStore();
  const [substitutes, setSubstitutes] = useState<SubstituteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubstitutes = useCallback(async () => {
    if (!user?.schoolId) return;
    try {
      const res = await apiClient.get('/attendance/substitutes', {
        params: { schoolId: user.schoolId },
      });
      setSubstitutes(unwrapList<SubstituteRecord>(res));
    } catch {
      console.error('Failed to load substitute assignments');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchSubstitutes();
  }, [fetchSubstitutes]);

  const userId = user?.id ?? '';

  /** Substitutions where the current user is the original teacher (being covered) */
  const mySubstitutions = useMemo(
    () => substitutes.filter((s) => getTeacherId(s.originalTeacherId) === userId),
    [substitutes, userId],
  );

  /** Substitutions where the current user is the substitute (covering for someone) */
  const coveringFor = useMemo(
    () => substitutes.filter((s) => getTeacherId(s.substituteTeacherId) === userId),
    [substitutes, userId],
  );

  return { substitutes, mySubstitutions, coveringFor, loading, fetchSubstitutes };
}
