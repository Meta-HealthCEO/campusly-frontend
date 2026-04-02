export type WhatsAppProvider = 'twilio' | '360dialog' | 'wati';
export type WhatsAppMessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
export type WhatsAppTemplateType =
  | 'fee_reminder'
  | 'absence_alert'
  | 'homework_due'
  | 'results_available'
  | 'event_reminder'
  | 'general_announcement'
  | 'transport_alert'
  | 'emergency';

export interface WhatsAppConfig {
  id: string;
  provider: WhatsAppProvider;
  credentials: { accountSid: string; authToken: string; phoneNumber: string };
  templateIds: Record<string, string>;
  enabled: boolean;
}

export interface WhatsAppMessage {
  id: string;
  recipientPhone: string;
  recipientName: string;
  templateType: WhatsAppTemplateType;
  status: WhatsAppMessageStatus;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failureReason?: string;
  createdAt: string;
}

export interface WhatsAppDeliveryStats {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface WhatsAppOptInStatus {
  optedIn: boolean;
  phoneNumber?: string;
  preferredLanguage?: string;
}
