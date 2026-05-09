'use client';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { HomeworkResource } from '@/types/homework';

export function useContentResource(resourceId: string | null | undefined): {
  resource: HomeworkResource | null;
  loading: boolean;
} {
  const [resource, setResource] = useState<HomeworkResource | null>(null);
  const [loading, setLoading] = useState(!!resourceId);

  useEffect(() => {
    if (!resourceId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    apiClient
      .get(`/content-library/student/resources/${resourceId}`, { signal: controller.signal })
      .then((res) => setResource(unwrapResponse<HomeworkResource>(res)))
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        console.error('Failed to load content resource', err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [resourceId]);

  return { resource, loading };
}
