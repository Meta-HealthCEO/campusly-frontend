'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

export interface SchoolRosterRow {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  classId: string | null;
  className: string | null;
}

interface UseRosterSearchResult {
  rows: SchoolRosterRow[];
  loading: boolean;
}

/**
 * Search the school-wide student roster. Pass `enabled: false` (e.g. dialog
 * closed) to skip fetching. Caller is responsible for debouncing `query`.
 */
export function useRosterSearch(query: string, enabled: boolean): UseRosterSearchResult {
  const [rows, setRows] = useState<SchoolRosterRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    apiClient
      .get('/students/search-roster', { params: { q: query } })
      .then((res) => {
        if (cancelled) return;
        setRows(unwrapList<SchoolRosterRow>(res));
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, query]);

  return { rows, loading };
}
