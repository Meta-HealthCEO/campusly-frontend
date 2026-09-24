'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapList } from '@/lib/api-helpers';
import type { LibraryEntry } from '@/lib/unit-library';

/** The school library: every released unit in the school, to copy from. */
export function useUnitLibrary(enabled: boolean) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setEntries(unwrapList<LibraryEntry>(await apiClient.get('/courses/library')));
      setError(null);
    } catch (err: unknown) {
      console.error('School library failed', err);
      setError(extractErrorMessage(err, "Couldn't load the school library. Refresh to try again."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  return { entries, loading, error, refresh: load };
}
