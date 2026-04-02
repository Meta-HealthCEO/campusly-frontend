'use client';

import { useEffect, useRef, useCallback } from 'react';
import { notificationsApi } from '@/lib/notifications-api';
import { unwrapResponse } from '@/lib/api-helpers';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useAuthStore } from '@/stores/useAuthStore';

const POLL_INTERVAL_MS = 60_000;

export function useNotificationPoller() {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      const raw = unwrapResponse(res);
      const count = typeof raw === 'number' ? raw : (raw.count as number) ?? 0;
      setUnreadCount(count);
    } catch {
      // Silently fail
    }
  }, [setUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchCount();

    intervalRef.current = setInterval(fetchCount, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, fetchCount]);
}
