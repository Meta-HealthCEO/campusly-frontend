'use client';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

export interface ResourceSummary {
  _id: string;
  title: string;
  type: string;
  status: string;
  subjectId?: string;
  gradeId?: string;
}

export function useTeacherResources(filters?: {
  subjectId?: string;
  gradeId?: string;
  curriculumNodeId?: string;
}): {
  resources: ResourceSummary[];
  loading: boolean;
} {
  const [resources, setResources] = useState<ResourceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params: Record<string, string> = { status: 'published' };
    if (filters?.subjectId) params.subjectId = filters.subjectId;
    if (filters?.gradeId) params.gradeId = filters.gradeId;
    if (filters?.curriculumNodeId) params.curriculumNodeId = filters.curriculumNodeId;

    const controller = new AbortController();
    apiClient
      .get('/content-library/resources', { params, signal: controller.signal })
      .then((res) => setResources(unwrapList<ResourceSummary>(res)))
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        console.error('Failed to load resources', err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [filters?.subjectId, filters?.gradeId, filters?.curriculumNodeId]);

  return { resources, loading };
}
