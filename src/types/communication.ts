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

// ============================================================
// Communication Admin — Channel Config, Delivery, Templates
// ============================================================

export type CommunicationChannel = 'email' | 'sms' | 'whatsapp' | 'push';
export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened';
export type TemplateChannel = CommunicationChannel | 'all';
export type TemplateCategory = 'attendance' | 'fees' | 'academic' | 'events' | 'general' | 'emergency';

export interface ChannelConfig {
  enabled: boolean;
  provider: string;
  fromName?: string;
  fromEmail?: string;
  replyToEmail?: string;
  senderId?: string;
  phoneNumber?: string;
  apiKeyConfigured: boolean;
  dailyLimit: number;
  usedToday: number;
}

export interface CommunicationConfig {
  id: string;
  schoolId: string;
  channels: Record<CommunicationChannel, ChannelConfig>;
  updatedAt: string;
}

export interface CommTemplate {
  id: string;
  schoolId: string;
  name: string;
  description: string;
  channel: TemplateChannel;
  category: TemplateCategory;
  subject: string;
  body: string;
  htmlBody?: string;
  variables: string[];
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

export interface DeliveryLog {
  id: string;
  batchId: string;
  channel: CommunicationChannel;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject: string;
  status: DeliveryStatus;
  cost: number;
  retryCount: number;
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  createdAt: string;
}

export interface DeliveryStats {
  totalSent: number;
  delivered: number;
  failed: number;
  bounced: number;
  opened: number;
  deliveryRate: number;
  openRate: number;
  totalCost: number;
  byChannel: Array<{
    channel: CommunicationChannel;
    sent: number;
    delivered: number;
    failed: number;
    opened?: number;
    cost: number;
  }>;
  byDay: Array<{ date: string; sent: number; delivered: number; failed: number }>;
}

export interface TemplatePreview {
  subject: string;
  body: string;
  htmlBody?: string;
}

export interface CreateCommTemplatePayload {
  name: string;
  description?: string;
  channel: TemplateChannel;
  category: TemplateCategory;
  subject?: string;
  body: string;
  htmlBody?: string;
  variables: string[];
  isDefault?: boolean;
}

export interface DeliveryLogFilters {
  channel?: CommunicationChannel;
  status?: DeliveryStatus;
  startDate?: string;
  endDate?: string;
  recipientSearch?: string;
  page?: number;
  limit?: number;
}

export interface TestChannelResult {
  messageId: string;
  status: string;
}
