// Communication module types — local to this module

export type TemplateType = 'fee_reminder' | 'absence' | 'general' | 'event' | 'emergency';
export type ChannelType = 'email' | 'sms' | 'whatsapp' | 'all';
export type RecipientScopeType = 'school' | 'grade' | 'class' | 'custom';
export type MessageStatus = 'draft' | 'queued' | 'sending' | 'sent' | 'failed';
export type LogStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'read';

export interface MessageTemplate {
  id: string;
  schoolId: string;
  name: string;
  type: TemplateType;
  subject: string;
  body: string;
  channel: ChannelType;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BulkMessageSender {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface BulkMessageTemplateRef {
  id: string;
  name: string;
}

export interface BulkMessage {
  id: string;
  schoolId: string;
  templateId?: string | BulkMessageTemplateRef;
  subject: string;
  body: string;
  channel: ChannelType;
  sentBy: string | BulkMessageSender;
  recipients: {
    type: RecipientScopeType;
    targetIds: string[];
  };
  totalRecipients: number;
  delivered: number;
  failed: number;
  status: MessageStatus;
  sentAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryStatEntry {
  status: LogStatus;
  count: number;
}

export interface LogRecipient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface MessageLogEntry {
  id: string;
  bulkMessageId: string;
  recipientId: string | LogRecipient;
  channel: string;
  status: LogStatus;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  error?: string;
  createdAt: string;
}

export interface CreateTemplateInput {
  schoolId: string;
  name: string;
  type: TemplateType;
  subject: string;
  body: string;
  channel?: ChannelType;
}

export interface SendBulkMessageInput {
  schoolId: string;
  templateId?: string;
  subject: string;
  body: string;
  channel?: ChannelType;
  recipients: {
    type: RecipientScopeType;
    targetIds?: string[];
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GradeOption {
  id: string;
  name: string;
}

export interface ClassOption {
  id: string;
  name: string;
  gradeId?: string;
}

export interface ParentOption {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  relationship?: string;
}
