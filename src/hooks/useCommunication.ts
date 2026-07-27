import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import {
  mapBulkMessage, mapDeliveryStat, mapMessageLog, extractArray,
} from '@/components/communication/mappers';
import type {
  BulkMessage,
  DeliveryStatEntry,
  MessageLogEntry,
  SendBulkMessageInput,
} from '@/components/communication/types';

// Template + option-list hooks moved to useCommunicationLookups.ts.
export { useTemplates, useGradesAndClasses, useParentsList } from './useCommunicationLookups';

export function useBulkMessages() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const [messages, setMessages] = useState<BulkMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async (p = 1) => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/communication/messages', {
        params: { schoolId, page: p },
      });
      const raw = unwrapResponse(res);
      const arr = extractArray(raw);
      setMessages(arr.map(mapBulkMessage));
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        setTotal((obj.total as number) ?? arr.length);
        setPage((obj.page as number) ?? p);
        setTotalPages((obj.totalPages as number) ?? 1);
      }
    } catch (err: unknown) {
      // Silently handle permission errors (teacher may not have access)
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 403) console.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const sendMessage = async (data: Omit<SendBulkMessageInput, 'schoolId'>) => {
    const res = await apiClient.post('/communication/send', { ...data, schoolId });
    const mapped = mapBulkMessage(unwrapResponse(res));
    setMessages((prev) => [mapped, ...prev]);
    return mapped;
  };

  const scheduleMessage = async (data: Omit<SendBulkMessageInput, 'schoolId'> & { scheduledFor: string }) => {
    const { scheduledFor, ...rest } = data;
    const res = await apiClient.post('/communication/schedule', { ...rest, schoolId, scheduledFor });
    const mapped = mapBulkMessage(unwrapResponse(res));
    setMessages((prev) => [mapped, ...prev]);
    return mapped;
  };

  const cancelScheduledMessage = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiClient.post(`/communication/scheduled/${id}/cancel`);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      toast.success('Scheduled message cancelled');
      return true;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Failed to cancel scheduled message';
      toast.error(msg);
      return false;
    }
  }, []);

  const getMessageLogs = useCallback(async (bulkId: string): Promise<MessageLogEntry[]> => {
    try {
      const res = await apiClient.get(`/communication/messages/${bulkId}/logs`, {
        params: { limit: 200 },
      });
      const raw = unwrapResponse(res);
      return extractArray(raw).map(mapMessageLog);
    } catch {
      toast.error('Failed to load delivery details');
      return [];
    }
  }, []);

  return { messages, total, page, totalPages, loading, fetchMessages, sendMessage, scheduleMessage, cancelScheduledMessage, setPage, getMessageLogs };
}

// ============== useScheduledMessages ==============
export function useScheduledMessages() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const [scheduled, setScheduled] = useState<import('@/components/communication/types').BulkMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScheduled = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/communication/messages', {
        params: { schoolId, status: 'scheduled', limit: 50 },
      });
      const raw = unwrapResponse(res);
      setScheduled(extractArray(raw).map(mapBulkMessage));
    } catch {
      console.error('Failed to load scheduled messages');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchScheduled(); }, [fetchScheduled]);

  const cancel = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiClient.post(`/communication/scheduled/${id}/cancel`);
      setScheduled((prev) => prev.filter((m) => m.id !== id));
      toast.success('Scheduled message cancelled');
      return true;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Failed to cancel scheduled message';
      toast.error(msg);
      return false;
    }
  }, []);

  return { scheduled, loading, fetchScheduled, cancel };
}

// ============== useMessageDetail ==============
export function useMessageDetail(messageId: string) {
  const [message, setMessage] = useState<BulkMessage | null>(null);
  const [stats, setStats] = useState<DeliveryStatEntry[]>([]);
  const [logs, setLogs] = useState<MessageLogEntry[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    if (!messageId) return;
    try {
      setLoading(true);
      const [msgRes, statsRes] = await Promise.all([
        apiClient.get(`/communication/messages/${messageId}`),
        apiClient.get(`/communication/messages/${messageId}/stats`),
      ]);
      setMessage(mapBulkMessage(unwrapResponse(msgRes)));
      const statsRaw = unwrapResponse(statsRes);
      const statsArr = Array.isArray(statsRaw) ? statsRaw : [];
      setStats(statsArr.map((s: Record<string, unknown>) => mapDeliveryStat(s)));
    } catch {
      console.error('Failed to load message detail');
    } finally {
      setLoading(false);
    }
  }, [messageId]);

  const fetchLogs = useCallback(async (p = 1) => {
    if (!messageId) return;
    try {
      const res = await apiClient.get(
        `/communication/messages/${messageId}/logs`,
        { params: { page: p } }
      );
      const raw = unwrapResponse(res);
      const arr = extractArray(raw);
      setLogs(arr.map(mapMessageLog));
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        setLogsTotal((obj.total as number) ?? arr.length);
        setLogsPage((obj.page as number) ?? p);
        setLogsTotalPages((obj.totalPages as number) ?? 1);
      }
    } catch {
      console.error('Failed to load delivery logs');
    }
  }, [messageId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const [readStats, setReadStats] = useState<{
    totalRecipients: number;
    readCount: number;
    readPercentage: number;
    avgTimeToReadMinutes: number;
  } | null>(null);
  const [readReceipts, setReadReceipts] = useState<Array<{
    userId: { id: string; firstName: string; lastName: string; email: string } | string;
    readAt: string;
  }>>([]);

  const fetchReadStats = useCallback(async () => {
    if (!messageId) return;
    try {
      const res = await apiClient.get(`/communication/messages/${messageId}/read-stats`);
      const raw = unwrapResponse(res);
      setReadStats({
        totalRecipients: (raw.totalRecipients as number) ?? 0,
        readCount: (raw.readCount as number) ?? 0,
        readPercentage: (raw.readPercentage as number) ?? 0,
        avgTimeToReadMinutes: (raw.avgTimeToReadMinutes as number) ?? 0,
      });
    } catch {
      console.error('Failed to load read stats');
    }
  }, [messageId]);

  const fetchReadReceipts = useCallback(async () => {
    if (!messageId) return;
    try {
      const res = await apiClient.get(`/communication/messages/${messageId}/read-receipts`);
      const raw = unwrapResponse(res);
      setReadReceipts(Array.isArray(raw) ? raw : []);
    } catch {
      console.error('Failed to load read receipts');
    }
  }, [messageId]);

  useEffect(() => {
    fetchReadStats();
  }, [fetchReadStats]);

  return {
    message, stats, logs, logsTotal, logsPage, logsTotalPages, loading,
    readStats, readReceipts,
    fetchDetail, fetchLogs, fetchReadStats, fetchReadReceipts, setLogsPage,
  };
}

// ============== useGradesAndClasses ==============
