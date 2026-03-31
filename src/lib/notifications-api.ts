import apiClient from '@/lib/api-client';
import type {
  CreateNotificationPayload,
  BulkNotificationPayload,
  UpdatePreferencesPayload,
} from '@/types/notifications';

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; isRead?: string }) =>
    apiClient.get('/notifications', { params }),

  getUnreadCount: () =>
    apiClient.get('/notifications/unread-count'),

  markAsRead: (id: string) =>
    apiClient.patch(`/notifications/${id}/read`),

  markAllAsRead: () =>
    apiClient.patch('/notifications/read-all'),

  create: (body: CreateNotificationPayload) =>
    apiClient.post('/notifications', body),

  bulkCreate: (body: BulkNotificationPayload) =>
    apiClient.post('/notifications/bulk', body),

  getPreferences: () =>
    apiClient.get('/notifications/preferences'),

  updatePreferences: (body: UpdatePreferencesPayload) =>
    apiClient.put('/notifications/preferences', body),
};
