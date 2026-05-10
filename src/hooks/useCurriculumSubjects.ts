'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { CurriculumNodeItem } from '@/types';

/**
 * Returns every CAPS subject node under a given grade node, sorted by order
 * then title. Used by the new-lesson flow on the standalone teacher portal —
 * the CAPS tree is the source of truth and the teacher gets unrestricted
 * access to every subject available for the picked grade.
 */
export function useCurriculumSubjects(
  frameworkId: string,
  gradeNodeId: string,
): { subjects: CurriculumNodeItem[]; loading: boolean } {
  const [subjects, setSubjects] = useState<CurriculumNodeItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!frameworkId || !gradeNodeId) {
      setSubjects([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiClient
      .get('/curriculum-structure/nodes', {
        params: {
          frameworkId,
          type: 'subject',
          parentId: gradeNodeId,
          limit: 200,
        },
      })
      .then((res) => {
        if (cancelled) return;
        const data = unwrapResponse<{ nodes: CurriculumNodeItem[] }>(res);
        const sorted = [...(data.nodes ?? [])].sort(
          (a, b) => a.order - b.order || a.title.localeCompare(b.title),
        );
        setSubjects(sorted);
      })
      .catch(() => {
        if (!cancelled) setSubjects([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [frameworkId, gradeNodeId]);

  return { subjects, loading };
}
