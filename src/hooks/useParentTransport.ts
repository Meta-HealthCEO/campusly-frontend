import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, mapId } from '@/lib/api-helpers';
import { useCurrentParent } from './useCurrentParent';
import type { TransportRoute } from '@/types';

interface ParentTransportResult {
  routes: TransportRoute[];
  loading: boolean;
}

export function useParentTransport(): ParentTransportResult {
  const { loading: parentLoading } = useCurrentParent();
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (parentLoading) return;

    async function fetchData() {
      try {
        const res = await apiClient.get('/transport/routes');
        const arr = unwrapList<Record<string, unknown>>(res, 'routes');
        setRoutes(arr.map(mapId) as unknown as TransportRoute[]);
      } catch {
        console.error('Failed to load transport routes');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [parentLoading]);

  return { routes, loading: loading || parentLoading };
}
