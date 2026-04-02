'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

export interface LatePickupEntry {
  studentId: string;
  studentName: string;
  parentPhone: string;
  checkInTime: string;
  minutesLate: number;
}

export function useAftercareLatePickups() {
  const [latePickups, setLatePickups] = useState<LatePickupEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLatePickups = useCallback(async (date?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (date) params.date = date;
      const res = await apiClient.get('/after-care/late-pickups', { params });
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : [];
      setLatePickups(arr as LatePickupEntry[]);
    } catch {
      console.error('Failed to load late pickups');
    } finally {
      setLoading(false);
    }
  }, []);

  return { latePickups, loading, fetchLatePickups };
}
