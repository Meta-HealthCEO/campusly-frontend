'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapList } from '@/lib/api-helpers';
import type { LibraryEntry } from '@/lib/unit-library';

/** Matches the backend's LIBRARY_PAGE_SIZE (src/modules/Course/service-unit-copy.ts). */
const PAGE_SIZE = 20;

export interface UnitLibraryFilters {
  gradeId?: string;
  subjectId?: string;
}

/** The school library: released units, filtered by grade/subject and paged with "Show more". */
export function useUnitLibrary(enabled: boolean) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [filters, setFilters] = useState<UnitLibraryFilters>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (targetPage: number, append: boolean): Promise<void> => {
    try {
      const res = unwrapList<LibraryEntry>(await apiClient.get('/courses/library', {
        params: { gradeId: filters.gradeId, subjectId: filters.subjectId, page: targetPage },
      }));
      setEntries((prev) => (append ? [...prev, ...res] : res));
      setHasMore(res.length === PAGE_SIZE);
      setPage(targetPage);
      setError(null);
    } catch (err: unknown) {
      console.error('School library failed', err);
      setError(extractErrorMessage(err, "Couldn't load the school library. Refresh to try again."));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters.gradeId, filters.subjectId]);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    void fetchPage(1, false);
  }, [enabled, fetchPage]);

  const loadMore = useCallback((): void => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    void fetchPage(page + 1, true);
  }, [fetchPage, hasMore, loadingMore, page]);

  const refresh = useCallback((): void => {
    setLoading(true);
    void fetchPage(1, false);
  }, [fetchPage]);

  return { entries, loading, loadingMore, hasMore, error, filters, setFilters, loadMore, refresh };
}
