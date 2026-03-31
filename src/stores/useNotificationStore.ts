import { create } from 'zustand';
import type {
  AppNotification,
  NotificationPreference,
  NotificationListResponse,
} from '@/types/notifications';
import { useUIStore } from './useUIStore';

interface NotificationState {
  notifications: AppNotification[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;

  unreadCount: number;

  preferences: NotificationPreference | null;
  preferencesLoading: boolean;

  setNotifications: (data: NotificationListResponse) => void;
  appendNotifications: (data: NotificationListResponse) => void;
  setUnreadCount: (count: number) => void;
  markOneAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setPreferences: (prefs: NotificationPreference) => void;
  setLoading: (loading: boolean) => void;
  setPreferencesLoading: (loading: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  total: 0,
  page: 1,
  totalPages: 1,
  isLoading: false,

  unreadCount: 0,

  preferences: null,
  preferencesLoading: false,

  setNotifications: (data) =>
    set({
      notifications: data.notifications,
      total: data.total,
      page: data.page,
      totalPages: data.totalPages,
    }),

  appendNotifications: (data) =>
    set((state) => ({
      notifications: [...state.notifications, ...data.notifications],
      total: data.total,
      page: data.page,
      totalPages: data.totalPages,
    })),

  setUnreadCount: (count) => {
    useUIStore.getState().setNotifications(count);
    set({ unreadCount: count });
  },

  markOneAsRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      );
      const wasUnread = state.notifications.find((n) => n.id === id && !n.isRead);
      const newCount = wasUnread
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount;
      useUIStore.getState().setNotifications(newCount);
      return { notifications: updated, unreadCount: newCount };
    }),

  markAllAsRead: () =>
    set((state) => {
      const now = new Date().toISOString();
      const updated = state.notifications.map((n) =>
        n.isRead ? n : { ...n, isRead: true, readAt: now }
      );
      useUIStore.getState().setNotifications(0);
      return { notifications: updated, unreadCount: 0 };
    }),

  setPreferences: (prefs) => set({ preferences: prefs }),
  setLoading: (isLoading) => set({ isLoading }),
  setPreferencesLoading: (preferencesLoading) => set({ preferencesLoading }),
}));
