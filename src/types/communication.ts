// ============================================================
// Communication Types — Messages & Notifications
// ============================================================

import type { User } from './common';

export interface Message {
  id: string;
  senderId: string;
  sender: User;
  recipientIds: string[];
  subject: string;
  body: string;
  type: 'message' | 'announcement' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  attachments: string[];
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  link?: string;
  createdAt: string;
}
