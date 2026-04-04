'use client';

import { useState, useCallback, useRef } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { CurriculumNodeItem } from '@/types';

type ChildCache = Map<string, CurriculumNodeItem[]>;

export function useCurriculumTree(frameworkId: string) {
  const [cache, setCache] = useState<ChildCache>(new Map());
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const cacheKey = (parentId: string | null): string =>
    parentId === null ? 'root' : parentId;

  const getChildren = useCallback(
    (parentId: string | null): CurriculumNodeItem[] | undefined => {
      return cache.get(cacheKey(parentId));
    },
    [cache],
  );

  const isLoading = useCallback(
    (parentId: string | null): boolean => {
      return loadingKeys.has(cacheKey(parentId));
    },
    [loadingKeys],
  );

  const fetchChildren = useCallback(
    async (parentId: string | null): Promise<CurriculumNodeItem[]> => {
      const key = cacheKey(parentId);

      // Return cached result immediately
      const cached = cacheRef.current.get(key);
      if (cached !== undefined) return cached;

      setLoadingKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });

      try {
        const params: Record<string, string | number> = {
          frameworkId,
          parentId: parentId === null ? 'null' : parentId,
          limit: 200,
        };
        const response = await apiClient.get('/curriculum-structure/nodes', { params });
        const result = unwrapResponse<{ nodes: CurriculumNodeItem[] }>(response);
        const nodes = result.nodes ?? [];

        setCache((prev) => {
          const next = new Map(prev);
          next.set(key, nodes);
          return next;
        });

        return nodes;
      } catch (err: unknown) {
        console.error('Failed to fetch curriculum children', err);
        return [];
      } finally {
        setLoadingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [frameworkId],
  );

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  return { getChildren, fetchChildren, isLoading, clearCache };
}
