'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { CurriculumNodeItem } from '@/types';

/**
 * Returns every CAPS grade node under the given framework, sorted by order
 * then title. Used by the new-lesson flow on the standalone teacher portal,
 * where the school has no Subject/Grade collections — the CAPS tree is the
 * source of truth and the teacher gets unrestricted access.
 */
export function useCurriculumGrades(frameworkId: string): {
  grades: CurriculumNodeItem[];
  loading: boolean;
} {
  const [grades, setGrades] = useState<CurriculumNodeItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!frameworkId) {
      setGrades([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiClient
      .get('/curriculum-structure/nodes', {
        params: { frameworkId, type: 'grade', limit: 200 },
      })
      .then((res) => {
        if (cancelled) return;
        const data = unwrapResponse<{ nodes: CurriculumNodeItem[] }>(res);
        const sorted = [...(data.nodes ?? [])].sort(
          (a, b) => a.order - b.order || a.title.localeCompare(b.title),
        );
        setGrades(sorted);
      })
      .catch(() => {
        if (!cancelled) setGrades([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [frameworkId]);

  return { grades, loading };
}
