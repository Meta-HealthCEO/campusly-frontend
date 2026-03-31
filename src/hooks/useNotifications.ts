'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { notificationsApi } from '@/lib/notifications-api';
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
  const store = useNotificationStore();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      const raw = res.data.data ?? res.data;
      const count = typeof raw === 'number' ? raw : (raw.count as number) ?? 0;
      store.setUnreadCount(count);
    } catch {
      // Silently fail — badge just shows stale count
    }
  }, [store]);

  const fetchNotifications = useCallback(
    async (params?: { page?: number; limit?: number; isRead?: string }) => {
      store.setLoading(true);
      try {
        const res = await notificationsApi.list(params);
        const raw = res.data.data ?? res.data;
        const notifArray = raw.notifications ?? raw;
        const notifications: AppNotification[] = Array.isArray(notifArray)
          ? notifArray.map((n: Record<string, unknown>) => mapNotification(n))
          : [];
        const listData: NotificationListResponse = {
          notifications,
          total: (raw.total as number) ?? notifications.length,
          page: (raw.page as number) ?? 1,
          limit: (raw.limit as number) ?? 20,
          totalPages: (raw.totalPages as number) ?? 1,
        };
        if (params?.page && params.page > 1) {
          store.appendNotifications(listData);
        } else {
          store.setNotifications(listData);
        }
        return listData;
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
          ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? 'Failed to load notifications';
        toast.error(msg);
        return null;
      } finally {
        store.setLoading(false);
      }
    },
    [store]
  );

  const markAsRead = useCallback(
    async (id: string) => {
      store.markOneAsRead(id);
      try {
        await notificationsApi.markAsRead(id);
      } catch {
        // Optimistic update already applied; refetch to correct if needed
        await fetchUnreadCount();
      }
    },
    [store, fetchUnreadCount]
  );

  const markAllAsRead = useCallback(async () => {
    store.markAllAsRead();
    try {
      await notificationsApi.markAllAsRead();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to mark all as read';
      toast.error(msg);
      await fetchUnreadCount();
    }
  }, [store, fetchUnreadCount]);

  const fetchPreferences = useCallback(async () => {
    store.setPreferencesLoading(true);
    try {
      const res = await notificationsApi.getPreferences();
      const raw = res.data.data ?? res.data;
      const prefs = mapPreference(raw as Record<string, unknown>);
      store.setPreferences(prefs);
      return prefs;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load notification preferences';
      toast.error(msg);
      return null;
    } finally {
      store.setPreferencesLoading(false);
    }
  }, [store]);

  const updatePreference = useCallback(
    async (field: 'email' | 'sms' | 'push' | 'inApp', value: boolean) => {
      const prev = store.preferences;
      if (prev) {
        store.setPreferences({ ...prev, [field]: value });
      }
      try {
        const res = await notificationsApi.updatePreferences({ [field]: value });
        const raw = res.data.data ?? res.data;
        const prefs = mapPreference(raw as Record<string, unknown>);
        store.setPreferences(prefs);
        toast.success('Preference updated');
      } catch (err: unknown) {
        if (prev) {
          store.setPreferences(prev);
        }
        const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
          ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? 'Failed to update preference';
        toast.error(msg);
      }
    },
    [store]
  );

  return {
    ...store,
    fetchUnreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    fetchPreferences,
    updatePreference,
  };
}
