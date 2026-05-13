import { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import type { SubstituteTeacher } from '@/types';

interface PopulatedUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

// Re-export the SubstituteTeacher type as SubstituteRecord for hook callers
export type SubstituteRecord = SubstituteTeacher;

interface SubstituteHistoryResponse {
  asOriginal: SubstituteRecord[];
  asSubstitute: SubstituteRecord[];
  counts: {
    totalAsOriginal: number;
    totalAsSubstitute: number;
    approved: number;
    pending: number;
    declined: number;
  };
}

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
    if (!user?.schoolId || !user?.id) {
      setSubstitutes([]);
      setLoading(false);
      return;
    }
    try {
      const res = await apiClient.get(
        `/attendance/substitutes/teacher/${user.id}/history`,
      );
      const history = unwrapResponse<SubstituteHistoryResponse>(res);
      setSubstitutes([
        ...(history.asOriginal ?? []),
        ...(history.asSubstitute ?? []),
      ]);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load substitute assignments');
      console.error(msg, err);
      toast.error(msg);
      setSubstitutes([]);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId, user?.id]);

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
