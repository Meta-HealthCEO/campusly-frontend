'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { notificationsApi } from '@/lib/notifications-api';
import { unwrapResponse } from '@/lib/api-helpers';
import { useNotificationStore } from '@/stores/useNotificationStore';
import type {
  AppNotification,
  NotificationPreference,
  NotificationListResponse,
} from '@/types/notifications';

function mapNotification(raw: Record<string, unknown>): AppNotification {
  return {
    id: (raw._id as string) ?? (raw.id as string) ?? '',
    recipientId: (raw.recipientId as string) ?? '',
    schoolId: (raw.schoolId as string) ?? '',
    type: (raw.type as AppNotification['type']) ?? 'in_app',
    title: (raw.title as string) ?? '',
    message: (raw.message as string) ?? '',
    data: (raw.data as Record<string, unknown>) ?? undefined,
    isRead: (raw.isRead as boolean) ?? false,
    readAt: (raw.readAt as string) ?? undefined,
    isDeleted: (raw.isDeleted as boolean) ?? false,
    createdAt: (raw.createdAt as string) ?? '',
    updatedAt: (raw.updatedAt as string) ?? '',
  };
}

function mapPreference(raw: Record<string, unknown>): NotificationPreference {
  return {
    id: (raw._id as string) ?? (raw.id as string) ?? '',
    userId: (raw.userId as string) ?? '',
    email: (raw.email as boolean) ?? true,
    sms: (raw.sms as boolean) ?? true,
    push: (raw.push as boolean) ?? true,
    inApp: (raw.inApp as boolean) ?? true,
    isDeleted: (raw.isDeleted as boolean) ?? false,
    createdAt: (raw.createdAt as string) ?? '',
    updatedAt: (raw.updatedAt as string) ?? '',
  };
}

export function useNotifications() {
  // Subscribe to reactive state with individual selectors. Subscribing to
  // the whole store via useNotificationStore() would re-render this hook
  // on every store mutation — and because setLoading() inside fetch calls
  // mutates state, the resulting store-ref change invalidates the
  // useCallback deps, hands a new fetchNotifications identity to
  // consumers, and fires their useEffect again. The dropdown's
  // [isOpen, fetchNotifications] effect then re-fetches on every render
  // — an infinite loop that spams "Failed to load notifications".
  const notifications = useNotificationStore((s) => s.notifications);
  const total = useNotificationStore((s) => s.total);
  const page = useNotificationStore((s) => s.page);
  const totalPages = useNotificationStore((s) => s.totalPages);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const preferences = useNotificationStore((s) => s.preferences);
  const preferencesLoading = useNotificationStore((s) => s.preferencesLoading);

  // Action selectors — Zustand actions are created once in the store
  // factory, so these references are stable across renders and safe to
  // use as useCallback deps.
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const appendNotifications = useNotificationStore((s) => s.appendNotifications);
  const setLoading = useNotificationStore((s) => s.setLoading);
  const markOneAsRead = useNotificationStore((s) => s.markOneAsRead);
  const markAllAsReadStore = useNotificationStore((s) => s.markAllAsRead);
  const setPreferences = useNotificationStore((s) => s.setPreferences);
  const setPreferencesLoading = useNotificationStore((s) => s.setPreferencesLoading);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      const raw = unwrapResponse(res);
      const count = typeof raw === 'number' ? raw : (raw.count as number) ?? 0;
      setUnreadCount(count);
    } catch {
      // Silently fail — badge just shows stale count
    }
  }, [setUnreadCount]);

  const fetchNotifications = useCallback(
    async (params?: { page?: number; limit?: number; isRead?: string }) => {
      setLoading(true);
      try {
        const res = await notificationsApi.list(params);
        const raw = unwrapResponse(res);
        const notifArray = raw.notifications ?? raw;
        const list: AppNotification[] = Array.isArray(notifArray)
          ? notifArray.map((n: Record<string, unknown>) => mapNotification(n))
          : [];
        const listData: NotificationListResponse = {
          notifications: list,
          total: (raw.total as number) ?? list.length,
          page: (raw.page as number) ?? 1,
          limit: (raw.limit as number) ?? 20,
          totalPages: (raw.totalPages as number) ?? 1,
        };
        if (params?.page && params.page > 1) {
          appendNotifications(listData);
        } else {
          setNotifications(listData);
        }
        return listData;
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
          ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? 'Failed to load notifications';
        toast.error(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setNotifications, appendNotifications]
  );

  const markAsRead = useCallback(
    async (id: string) => {
      markOneAsRead(id);
      try {
        await notificationsApi.markAsRead(id);
      } catch {
        // Optimistic update already applied; refetch to correct if needed
        await fetchUnreadCount();
      }
    },
    [markOneAsRead, fetchUnreadCount]
  );

  const markAllAsRead = useCallback(async () => {
    markAllAsReadStore();
    try {
      await notificationsApi.markAllAsRead();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to mark all as read';
      toast.error(msg);
      await fetchUnreadCount();
    }
  }, [markAllAsReadStore, fetchUnreadCount]);

  const fetchPreferences = useCallback(async () => {
    setPreferencesLoading(true);
    try {
      const res = await notificationsApi.getPreferences();
      const raw = unwrapResponse(res);
      const prefs = mapPreference(raw as Record<string, unknown>);
      setPreferences(prefs);
      return prefs;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load notification preferences';
      toast.error(msg);
      return null;
    } finally {
      setPreferencesLoading(false);
    }
  }, [setPreferences, setPreferencesLoading]);

  const updatePreference = useCallback(
    async (field: 'email' | 'sms' | 'push' | 'inApp', value: boolean) => {
      // Read latest preferences via getState — avoids adding `preferences`
      // to deps (which would re-create this callback on every prefs change
      // and propagate identity churn to consumers).
      const prev = useNotificationStore.getState().preferences;
      if (prev) {
        setPreferences({ ...prev, [field]: value });
      }
      try {
        const res = await notificationsApi.updatePreferences({ [field]: value });
        const raw = unwrapResponse(res);
        const prefs = mapPreference(raw as Record<string, unknown>);
        setPreferences(prefs);
        toast.success('Preference updated');
      } catch (err: unknown) {
        if (prev) {
          setPreferences(prev);
        }
        const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
          ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? 'Failed to update preference';
        toast.error(msg);
      }
    },
    [setPreferences]
  );

  return {
    notifications,
    total,
    page,
    totalPages,
    isLoading,
    unreadCount,
    preferences,
    preferencesLoading,
    fetchUnreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    fetchPreferences,
    updatePreference,
  };
}
