import { useEffect, useState } from 'react';
import type { AxiosResponse } from 'axios';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

export interface ContentResourceLite {
  _id: string;
  title: string;
  type: string;
  subjectId: string | { _id?: string; id?: string; name?: string };
  gradeId?: string | { _id?: string; id?: string; name?: string };
}

interface UseContentResourceLibraryParams {
  classId: string;
  subjectId: string;
  q?: string;
}

interface UseContentResourceLibraryResult {
  resources: ContentResourceLite[];
  loading: boolean;
}

/**
 * Lightweight content-resource listing hook for the lesson-plan
 * ReadingPicker.
 *
 * Fetches approved + visible content resources filtered by subject
 * (and optional title search) from the backend Content Library module
 * (`GET /content-library/resources?subjectId&search`). The `classId`
 * is accepted for API parity with the other lesson-plan pickers but is
 * not forwarded to the backend — the content library is scoped by
 * subject + grade, not by class. Search is performed server-side via
 * the `search` query param.
 *
 * Intentionally independent of `useContentLibrary` to keep the picker
 * decoupled from the full Content Library page's mutation-heavy state.
 */
export function useContentResourceLibrary(
  params: UseContentResourceLibraryParams,
): UseContentResourceLibraryResult {
  const { classId, subjectId, q } = params;
  const [resources, setResources] = useState<ContentResourceLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId || !subjectId) {
      setResources([]);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const query: Record<string, string | number> = {
      subjectId,
      status: 'approved',
      limit: 50,
    };
    if (q && q.trim()) query.search = q.trim();

    apiClient
      .get('/content-library/resources', { params: query })
      .then((res: AxiosResponse) => {
        if (cancelled) return;
        setResources(unwrapList<ContentResourceLite>(res, 'resources'));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load content resource library', err);
        setResources([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [classId, subjectId, q]);

  return { resources, loading };
}
