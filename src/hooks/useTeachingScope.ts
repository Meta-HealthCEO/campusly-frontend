'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { TeachingScope } from '@/types';

const EMPTY: TeachingScope = { grades: [], subjectsByGrade: [] };

export function useTeachingScope() {
  const [scope, setScope] = useState<TeachingScope>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/teacher-settings/teaching-scope');
      const data = unwrapResponse<TeachingScope>(res);
      setScope({
        grades: data?.grades ?? [],
        subjectsByGrade: data?.subjectsByGrade ?? [],
      });
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to load teaching scope', err);
      setError('Could not load teaching scope');
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (next: TeachingScope): Promise<TeachingScope | null> => {
    try {
      const res = await apiClient.put('/teacher-settings/teaching-scope', next);
      const data = unwrapResponse<TeachingScope>(res);
      const saved: TeachingScope = {
        grades: data?.grades ?? [],
        subjectsByGrade: data?.subjectsByGrade ?? [],
      };
      setScope(saved);
      return saved;
    } catch (err: unknown) {
      console.error('Failed to save teaching scope', err);
      return null;
    }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  return { scope, loading, error, refetch: fetch, save, isEmpty: scope.grades.length === 0 };
}
