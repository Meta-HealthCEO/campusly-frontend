import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import type {
  CommunicationConfig,
  CommunicationChannel,
  CommTemplate,
  DeliveryLog,
  DeliveryStats,
  CreateCommTemplatePayload,
  DeliveryLogFilters,
  TemplatePreview,
  TestChannelResult,
} from '@/types';

function mapConfig(raw: Record<string, unknown>): CommunicationConfig {
  return {
    id: (raw._id as string) ?? (raw.id as string) ?? '',
    schoolId: (raw.schoolId as string) ?? '',
    channels: (raw.channels as CommunicationConfig['channels']) ?? {
      email: { enabled: false, provider: '', apiKeyConfigured: false, dailyLimit: 0, usedToday: 0 },
      sms: { enabled: false, provider: '', apiKeyConfigured: false, dailyLimit: 0, usedToday: 0 },
      whatsapp: { enabled: false, provider: '', apiKeyConfigured: false, dailyLimit: 0, usedToday: 0 },
      push: { enabled: false, provider: '', apiKeyConfigured: false, dailyLimit: 0, usedToday: 0 },
    },
    updatedAt: (raw.updatedAt as string) ?? '',
  };
}

function mapTemplate(raw: Record<string, unknown>): CommTemplate {
  return {
    id: (raw._id as string) ?? (raw.id as string) ?? '',
    schoolId: (raw.schoolId as string) ?? '',
    name: (raw.name as string) ?? '',
    description: (raw.description as string) ?? '',
    channel: (raw.channel as CommTemplate['channel']) ?? 'all',
    category: (raw.category as CommTemplate['category']) ?? 'general',
    subject: (raw.subject as string) ?? '',
    body: (raw.body as string) ?? '',
    htmlBody: (raw.htmlBody as string) ?? undefined,
    variables: (raw.variables as string[]) ?? [],
    isDefault: (raw.isDefault as boolean) ?? false,
    isActive: (raw.isActive as boolean) ?? true,
    usageCount: (raw.usageCount as number) ?? 0,
    createdAt: (raw.createdAt as string) ?? '',
  };
}

function mapLog(raw: Record<string, unknown>): DeliveryLog {
  return {
    id: (raw._id as string) ?? (raw.id as string) ?? '',
    batchId: (raw.batchId as string) ?? '',
    channel: (raw.channel as DeliveryLog['channel']) ?? 'email',
    recipientName: (raw.recipientName as string) ?? '',
    recipientEmail: (raw.recipientEmail as string) ?? undefined,
    recipientPhone: (raw.recipientPhone as string) ?? undefined,
    subject: (raw.subject as string) ?? (raw.bodyPreview as string) ?? '',
    status: (raw.status as DeliveryLog['status']) ?? 'queued',
    cost: (raw.cost as number) ?? 0,
    retryCount: (raw.retryCount as number) ?? 0,
    errorMessage: (raw.errorMessage as string) ?? null,
    sentAt: (raw.sentAt as string) ?? null,
    deliveredAt: (raw.deliveredAt as string) ?? null,
    openedAt: (raw.openedAt as string) ?? null,
    createdAt: (raw.createdAt as string) ?? '',
  };
}

function extractArr(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    for (const key of ['templates', 'logs', 'data', 'items']) {
      if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
    }
  }
  return [];
}

// ============== useCommConfig ==============
export function useCommConfig() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const [config, setConfig] = useState<CommunicationConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/communication/config', { params: { schoolId } });
      setConfig(mapConfig(unwrapResponse(res)));
    } catch {
      console.error('Failed to load communication config');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const updateConfig = useCallback(async (data: Record<string, unknown>) => {
    const res = await apiClient.put('/communication/config', { ...data, schoolId });
    const updated = mapConfig(unwrapResponse(res));
    setConfig(updated);
    toast.success('Configuration updated');
    return updated;
  }, [schoolId]);

  const testChannel = useCallback(async (
    channel: CommunicationChannel,
    recipient: Record<string, string>,
  ): Promise<TestChannelResult> => {
    const res = await apiClient.post('/communication/config/test', {
      schoolId, channel, ...recipient,
    });
    const raw = unwrapResponse<Record<string, unknown>>(res);
    toast.success(`Test ${channel} sent successfully`);
    return { messageId: (raw.messageId as string) ?? '', status: (raw.status as string) ?? 'sent' };
  }, [schoolId]);

  return { config, loading, fetchConfig, updateConfig, testChannel };
}

// ============== useCommTemplates ==============
export function useCommTemplates() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const [templates, setTemplates] = useState<CommTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async (filters?: Record<string, string>) => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/communication/templates', {
        params: { schoolId, ...filters },
      });
      setTemplates(extractArr(unwrapResponse(res)).map(mapTemplate));
    } catch {
      console.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const createTemplate = useCallback(async (data: CreateCommTemplatePayload) => {
    const res = await apiClient.post('/communication/templates', { ...data, schoolId });
    const tpl = mapTemplate(unwrapResponse(res));
    setTemplates((prev) => [tpl, ...prev]);
    toast.success('Template created');
    return tpl;
  }, [schoolId]);

  const updateTemplate = useCallback(async (
    id: string, data: Partial<CreateCommTemplatePayload>,
  ) => {
    const res = await apiClient.put(`/communication/templates/${id}`, data);
    const tpl = mapTemplate(unwrapResponse(res));
    setTemplates((prev) => prev.map((t) => (t.id === id ? tpl : t)));
    toast.success('Template updated');
    return tpl;
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    await apiClient.delete(`/communication/templates/${id}`);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success('Template deleted');
  }, []);

  const previewTemplate = useCallback(async (
    id: string, variables: Record<string, string>,
  ): Promise<TemplatePreview> => {
    const res = await apiClient.post(`/communication/templates/${id}/preview`, { variables });
    const raw = unwrapResponse<Record<string, unknown>>(res);
    return {
      subject: (raw.subject as string) ?? '',
      body: (raw.body as string) ?? '',
      htmlBody: (raw.htmlBody as string) ?? undefined,
    };
  }, []);

  return { templates, loading, fetchTemplates, createTemplate, updateTemplate, deleteTemplate, previewTemplate };
}

// ============== useDeliveryLog ==============
export function useDeliveryLog() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async (filters?: DeliveryLogFilters) => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/communication/delivery-log', {
        params: { schoolId, ...filters },
      });
      const raw = unwrapResponse<Record<string, unknown>>(res);
      setLogs(extractArr(raw).map(mapLog));
      setTotal((raw.total as number) ?? 0);
      setPage((raw.page as number) ?? 1);
      setTotalPages((raw.totalPages as number) ?? 1);
    } catch {
      console.error('Failed to load delivery logs');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const retryMessage = useCallback(async (logId: string) => {
    await apiClient.post(`/communication/delivery-log/${logId}/retry`);
    toast.success('Message queued for retry');
  }, []);

  return { logs, total, page, totalPages, loading, fetchLogs, retryMessage, setPage };
}

// ============== useDeliveryStats ==============
export function useDeliveryStats() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async (filters?: {
    startDate?: string; endDate?: string; channel?: string;
  }) => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/communication/delivery-stats', {
        params: { schoolId, ...filters },
      });
      const raw = unwrapResponse<Record<string, unknown>>(res);
      setStats({
        totalSent: (raw.totalSent as number) ?? 0,
        delivered: (raw.delivered as number) ?? 0,
        failed: (raw.failed as number) ?? 0,
        bounced: (raw.bounced as number) ?? 0,
        opened: (raw.opened as number) ?? 0,
        deliveryRate: (raw.deliveryRate as number) ?? 0,
        openRate: (raw.openRate as number) ?? 0,
        totalCost: (raw.totalCost as number) ?? 0,
        byChannel: (raw.byChannel as DeliveryStats['byChannel']) ?? [],
        byDay: (raw.byDay as DeliveryStats['byDay']) ?? [],
      });
    } catch {
      console.error('Failed to load delivery stats');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  return { stats, loading, fetchStats };
}
