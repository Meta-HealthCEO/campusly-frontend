import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { ProgrammeMatchResult } from '@/types';

export interface MatchFilters {
  status?: 'eligible' | 'close' | 'all';
  universityId?: string;
  field?: string;
  page?: number;
  limit?: number;
}

export function useProgrammeMatcher(
  studentId: string,
  initialFilters?: MatchFilters,
) {
  const [matchResult, setMatchResult] = useState<ProgrammeMatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(
    async (filters?: MatchFilters) => {
      if (!studentId) return;

      setLoading(true);
      setError(null);

      try {
        const merged = { ...initialFilters, ...filters };
        const params: Record<string, string | number> = {};

        if (merged.status) params.status = merged.status;
        if (merged.universityId) params.universityId = merged.universityId;
        if (merged.field) params.field = merged.field;
        if (merged.page != null) params.page = merged.page;
        if (merged.limit != null) params.limit = merged.limit;

        const response = await apiClient.get(
          `/careers/match/student/${studentId}`,
          { params },
        );
        const data = unwrapResponse<ProgrammeMatchResult>(response);
        setMatchResult(data);
      } catch (err: unknown) {
        const message = extractErrorMessage(err, 'Failed to load programme matches');
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [studentId, initialFilters],
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { matchResult, loading, error, refetch };
}
