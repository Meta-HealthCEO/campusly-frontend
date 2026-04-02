import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { TimetableClash } from '@/types';

export function useTimetableClashes() {
  const [clashes, setClashes] = useState<TimetableClash[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const checkClashes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/academic/timetable/clashes');
      const raw = unwrapResponse(res);
      setClashes(Array.isArray(raw) ? (raw as TimetableClash[]) : []);
      setHasChecked(true);
    } catch (err: unknown) {
      console.error('Failed to check timetable clashes', err);
      setClashes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { clashes, loading, hasChecked, checkClashes };
}
