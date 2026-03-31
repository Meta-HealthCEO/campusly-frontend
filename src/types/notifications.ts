export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';

export interface AppNotification {
  id: string;
  recipientId: string;
  schoolId: string;
  type: NotificationChannel;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  notifications: AppNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateNotificationPayload {
  recipientId: string;
  schoolId: string;
  type: NotificationChannel;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface BulkNotificationPayload {
  schoolId: string;
  targetType: 'class' | 'grade' | 'school';
  targetId: string;
  type: NotificationChannel;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface UpdatePreferencesPayload {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  inApp?: boolean;
}
