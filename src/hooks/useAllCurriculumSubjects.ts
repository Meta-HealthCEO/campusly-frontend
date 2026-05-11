'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import type { CurriculumNodeItem } from '@/types';

/**
 * Returns every CAPS subject node across all grades for the school's default
 * framework. Used as a fallback source when academic Subject collections are
 * sparse (standalone teacher portal) — ensures filter dropdowns show
 * everything the curriculum exposes.
 */
export function useAllCurriculumSubjects(): {
  subjects: CurriculumNodeItem[];
  loading: boolean;
} {
  const { selectedFramework, frameworks } = useCurriculumStructure();
  const frameworkId =
    frameworks.find((f) => f.isDefault)?.id ?? frameworks[0]?.id ?? selectedFramework ?? '';
  const [subjects, setSubjects] = useState<CurriculumNodeItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!frameworkId) { setSubjects([]); return; }
    let cancelled = false;
    setLoading(true);
    apiClient
      .get('/curriculum-structure/nodes', {
        params: { frameworkId, type: 'subject', limit: 200 },
      })
      .then((res) => {
        if (cancelled) return;
        const data = unwrapResponse<{ nodes: CurriculumNodeItem[] }>(res);
        const sorted = [...(data.nodes ?? [])].sort((a, b) =>
          a.title.localeCompare(b.title),
        );
        setSubjects(sorted);
      })
      .catch(() => {
        if (!cancelled) setSubjects([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [frameworkId]);

  return { subjects, loading };
}
