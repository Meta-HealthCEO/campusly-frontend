import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  mapTemplate, mapBulkMessage, mapDeliveryStat, mapMessageLog, mapId, extractArray,
} from '@/components/communication/mappers';
import type {
  MessageTemplate,
  BulkMessage,
  DeliveryStatEntry,
  MessageLogEntry,
  CreateTemplateInput,
  SendBulkMessageInput,
  GradeOption,
  ClassOption,
  ParentOption,
} from '@/components/communication/types';

// ============== useTemplates ==============
export function useTemplates() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/communication/templates', {
        params: { schoolId },
      });
      const raw = unwrapResponse(res);
      setTemplates(extractArray(raw).map(mapTemplate));
    } catch {
      console.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const createTemplate = async (data: Omit<CreateTemplateInput, 'schoolId'>) => {
    const res = await apiClient.post('/communication/templates', { ...data, schoolId });
    const mapped = mapTemplate(unwrapResponse(res));
    setTemplates((prev) => [mapped, ...prev]);
    return mapped;
  };

  const updateTemplate = async (
    id: string,
    data: Partial<Omit<CreateTemplateInput, 'schoolId'>>
  ) => {
    const res = await apiClient.put(`/communication/templates/${id}`, data);
    const mapped = mapTemplate(unwrapResponse(res));
    setTemplates((prev) => prev.map((t) => (t.id === id ? mapped : t)));
    return mapped;
  };

  const deleteTemplate = async (id: string) => {
    await apiClient.delete(`/communication/templates/${id}`);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return { templates, loading, fetchTemplates, createTemplate, updateTemplate, deleteTemplate };
}

// ============== useBulkMessages ==============
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
    } catch {
      console.error('Failed to load messages');
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

  return { messages, total, page, totalPages, loading, fetchMessages, sendMessage, setPage };
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

  return {
    message, stats, logs, logsTotal, logsPage, logsTotalPages, loading,
    fetchDetail, fetchLogs, setLogsPage,
  };
}

// ============== useGradesAndClasses ==============
export function useGradesAndClasses() {
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [gradesRes, classesRes] = await Promise.all([
          apiClient.get('/academic/grades'),
          apiClient.get('/academic/classes'),
        ]);
        const gradesArr = extractArray(unwrapResponse(gradesRes));
        setGrades(gradesArr.map((g) => ({ id: mapId(g), name: (g.name as string) ?? '' })));

        const classesArr = extractArray(unwrapResponse(classesRes));
        setClasses(classesArr.map((c) => ({
          id: mapId(c),
          name: (c.name as string) ?? '',
          gradeId: (c.gradeId as string) ?? (c.grade as string) ?? undefined,
        })));
      } catch {
        console.error('Failed to load grades/classes');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { grades, classes, loading };
}

// ============== useParentsList ==============
export function useParentsList() {
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get('/parents');
        const arr = extractArray(unwrapResponse(res));
        setParents(arr.map((p) => {
          const userRaw = p.user as Record<string, unknown> | undefined;
          return {
            id: mapId(p),
            userId: (p.userId as string) ?? '',
            firstName: (userRaw?.firstName as string) ?? (p.firstName as string) ?? '',
            lastName: (userRaw?.lastName as string) ?? (p.lastName as string) ?? '',
            email: (userRaw?.email as string) ?? (p.email as string) ?? '',
            relationship: (p.relationship as string) ?? undefined,
          };
        }));
      } catch {
        console.error('Failed to load parents');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { parents, loading };
}
