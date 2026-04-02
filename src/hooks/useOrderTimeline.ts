'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

export interface TimelineEntry {
  status: string;
  timestamp: string;
  notes?: string;
}

export function useOrderTimeline(orderId: string) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTimeline = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/uniforms/orders/${orderId}/timeline`);
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : [];
      setTimeline(arr as TimelineEntry[]);
    } catch {
      console.error('Failed to load order timeline');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return { timeline, loading };
}
