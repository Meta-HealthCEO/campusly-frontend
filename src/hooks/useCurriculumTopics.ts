'use client';

import { useEffect, useState } from 'react';
import type { AxiosResponse } from 'axios';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

export interface CurriculumTopic {
  _id: string;
  title: string;
  code?: string;
}

interface UseCurriculumTopicsParams {
  subjectId: string;
  gradeId: string;
}

interface UseCurriculumTopicsResult {
  topics: CurriculumTopic[];
  loading: boolean;
}

/**
 * Lists curriculum nodes of type=topic for a given subject + grade.
 * Backend route: GET /api/curriculum-structure/nodes
 *
 * The hook is a no-op until both subjectId and gradeId are provided.
 * On error, sets topics to [] silently (callers render an empty state).
 */
export function useCurriculumTopics(
  params: UseCurriculumTopicsParams,
): UseCurriculumTopicsResult {
  const { subjectId, gradeId } = params;
  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subjectId || !gradeId) {
      setTopics([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiClient
      .get('/curriculum-structure/nodes', {
        params: { type: 'topic', subjectId, gradeId },
      })
      .then((res: AxiosResponse) => {
        if (!cancelled) setTopics(unwrapList<CurriculumTopic>(res));
      })
      .catch((err: unknown) => {
        console.error('Failed to load curriculum topics', err);
        if (!cancelled) setTopics([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId, gradeId]);

  return { topics, loading };
}
