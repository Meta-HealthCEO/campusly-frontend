'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { PaperMarkingRoster } from '@/types/papers';

export function usePaperMarkingRoster(paperId: string | undefined): {
  roster: PaperMarkingRoster | null;
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [roster, setRoster] = useState<PaperMarkingRoster | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!paperId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/question-bank/papers/${paperId}/marking-roster`);
      setRoster(unwrapResponse<PaperMarkingRoster>(res));
    } catch (err: unknown) {
      console.error('Failed to load marking roster', err);
      setRoster(null);
    } finally {
      setLoading(false);
    }
  }, [paperId]);

  useEffect(() => { void refetch(); }, [refetch]);

  return { roster, loading, refetch };
}
