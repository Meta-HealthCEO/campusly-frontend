import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { TermMarksResponse } from '@/types';

export function useTermMarks(structureId: string | null) {
  const [termMarks, setTermMarks] = useState<TermMarksResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTermMarks = useCallback(async () => {
    if (!structureId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/assessment-structures/${structureId}/term-marks`);
      setTermMarks(unwrapResponse<TermMarksResponse>(res));
    } catch (err: unknown) {
      console.error('Failed to load term marks', err);
      toast.error(extractErrorMessage(err, 'Could not load term marks'));
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  useEffect(() => {
    void fetchTermMarks();
  }, [fetchTermMarks]);

  return { termMarks, loading, fetchTermMarks };
}
