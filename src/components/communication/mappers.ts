import type {
  MessageTemplate,
  BulkMessage,
  DeliveryStatEntry,
  MessageLogEntry,
} from './types';

export function mapId(item: Record<string, unknown>): string {
  return (item._id as string) ?? (item.id as string) ?? '';
}

export function mapTemplate(item: Record<string, unknown>): MessageTemplate {
  return {
    id: mapId(item),
    schoolId: (item.schoolId as string) ?? '',
    name: (item.name as string) ?? '',
    type: (item.type as MessageTemplate['type']) ?? 'general',
    subject: (item.subject as string) ?? '',
    body: (item.body as string) ?? '',
    channel: (item.channel as MessageTemplate['channel']) ?? 'all',
    isDeleted: (item.isDeleted as boolean) ?? false,
    createdAt: (item.createdAt as string) ?? '',
    updatedAt: (item.updatedAt as string) ?? '',
  };
}

export function mapBulkMessage(item: Record<string, unknown>): BulkMessage {
  const sentByRaw = item.sentBy;
  let sentBy: BulkMessage['sentBy'] = '';
  if (typeof sentByRaw === 'string') {
    sentBy = sentByRaw;
  } else if (sentByRaw && typeof sentByRaw === 'object') {
    const s = sentByRaw as Record<string, unknown>;
    sentBy = {
      id: mapId(s),
      firstName: (s.firstName as string) ?? '',
      lastName: (s.lastName as string) ?? '',
      email: (s.email as string) ?? '',
    };
  }

  const templateRaw = item.templateId;
  let templateId: BulkMessage['templateId'];
  if (typeof templateRaw === 'string') {
    templateId = templateRaw;
  } else if (templateRaw && typeof templateRaw === 'object') {
    const t = templateRaw as Record<string, unknown>;
    templateId = { id: mapId(t), name: (t.name as string) ?? '' };
  }

  const recipientsRaw = (item.recipients ?? {}) as Record<string, unknown>;

  return {
    id: mapId(item),
    schoolId: (item.schoolId as string) ?? '',
    templateId,
    subject: (item.subject as string) ?? '',
    body: (item.body as string) ?? '',
    channel: (item.channel as BulkMessage['channel']) ?? 'all',
    sentBy,
    recipients: {
      type: (recipientsRaw.type as BulkMessage['recipients']['type']) ?? 'school',
      targetIds: (recipientsRaw.targetIds as string[]) ?? [],
    },
    totalRecipients: (item.totalRecipients as number) ?? 0,
    delivered: (item.delivered as number) ?? 0,
    failed: (item.failed as number) ?? 0,
    status: (item.status as BulkMessage['status']) ?? 'draft',
    sentAt: (item.sentAt as string) ?? undefined,
    isDeleted: (item.isDeleted as boolean) ?? false,
    createdAt: (item.createdAt as string) ?? '',
    updatedAt: (item.updatedAt as string) ?? '',
  };
}

export function mapDeliveryStat(s: Record<string, unknown>): DeliveryStatEntry {
  return {
    status: (s.status ?? s._id) as DeliveryStatEntry['status'],
    count: (s.count as number) ?? 0,
  };
}

export function mapMessageLog(item: Record<string, unknown>): MessageLogEntry {
  const recipientRaw = item.recipientId;
  let recipientId: MessageLogEntry['recipientId'] = '';
  if (typeof recipientRaw === 'string') {
    recipientId = recipientRaw;
  } else if (recipientRaw && typeof recipientRaw === 'object') {
    const r = recipientRaw as Record<string, unknown>;
    recipientId = {
      id: mapId(r),
      firstName: (r.firstName as string) ?? '',
      lastName: (r.lastName as string) ?? '',
      email: (r.email as string) ?? '',
    };
  }
  return {
    id: mapId(item),
    bulkMessageId: (item.bulkMessageId as string) ?? '',
    recipientId,
    channel: (item.channel as string) ?? '',
    status: (item.status as MessageLogEntry['status']) ?? 'queued',
    sentAt: (item.sentAt as string) ?? undefined,
    deliveredAt: (item.deliveredAt as string) ?? undefined,
    readAt: (item.readAt as string) ?? undefined,
    error: (item.error as string) ?? undefined,
    createdAt: (item.createdAt as string) ?? '',
  };
}

export function extractArray(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  }
  return [];
}
