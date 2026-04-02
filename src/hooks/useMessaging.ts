import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import type {
  MessageThread,
  ThreadMessage,
  ThreadDetail,
  CreateThreadPayload,
} from '@/types';

interface RawThread extends Record<string, unknown> {
  _id?: string;
  id?: string;
  unreadCount?: Record<string, number> | Map<string, number>;
}

function mapThread(raw: RawThread, userId: string): MessageThread {
  const id = (raw._id as string) ?? (raw.id as string) ?? '';
  const unreadMap = raw.unreadCount;
  let unread = 0;
  if (unreadMap instanceof Map) {
    unread = unreadMap.get(userId) ?? 0;
  } else if (unreadMap && typeof unreadMap === 'object') {
    unread = (unreadMap as Record<string, number>)[userId] ?? 0;
  }

  const studentRaw = raw.studentId as Record<string, unknown> | string | undefined;
  let studentName: string | undefined;
  let studentId: string;
  if (studentRaw && typeof studentRaw === 'object') {
    studentName = (studentRaw.firstName as string ?? '') + ' ' + (studentRaw.lastName as string ?? '');
    studentId = (studentRaw._id as string) ?? (studentRaw.id as string) ?? '';
  } else {
    studentId = (studentRaw as string) ?? '';
  }

  return {
    id,
    schoolId: (raw.schoolId as string) ?? '',
    studentId,
    studentName: studentName?.trim() || undefined,
    participants: (raw.participants as MessageThread['participants']) ?? [],
    subject: (raw.subject as string) ?? '',
    lastMessageAt: (raw.lastMessageAt as string) ?? '',
    lastMessagePreview: (raw.lastMessagePreview as string) ?? '',
    unreadCount: unread,
    isClosed: (raw.isClosed as boolean) ?? false,
    createdAt: (raw.createdAt as string) ?? '',
  };
}

function mapMessage(raw: Record<string, unknown>): ThreadMessage {
  return {
    id: (raw._id as string) ?? (raw.id as string) ?? '',
    threadId: (raw.threadId as string) ?? '',
    senderId: (raw.senderId as string) ?? '',
    senderRole: (raw.senderRole as ThreadMessage['senderRole']) ?? 'teacher',
    senderName: (raw.senderName as string) ?? '',
    content: (raw.content as string) ?? '',
    attachments: (raw.attachments as ThreadMessage['attachments']) ?? [],
    readBy: (raw.readBy as ThreadMessage['readBy']) ?? [],
    createdAt: (raw.createdAt as string) ?? '',
  };
}

export function useMessaging() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [currentThread, setCurrentThread] = useState<ThreadDetail | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/messaging/threads');
      const raw = unwrapResponse<Record<string, unknown>>(res);
      const arr = Array.isArray(raw) ? raw : (raw.threads as RawThread[]) ?? [];
      setThreads((arr as RawThread[]).map((t) => mapThread(t, userId)));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to load threads'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadThread = useCallback(async (threadId: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/messaging/threads/${threadId}`);
      const raw = unwrapResponse<Record<string, unknown>>(res);
      const thread = mapThread((raw.thread ?? raw) as RawThread, userId);
      const msgs = ((raw.messages as Record<string, unknown>[]) ?? []).map(mapMessage);
      setCurrentThread({ thread, messages: msgs, total: (raw.total as number) ?? msgs.length });
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to load thread'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await apiClient.get('/messaging/unread-count');
      const raw = unwrapResponse<Record<string, unknown>>(res);
      setUnreadCount((raw.totalUnread as number) ?? 0);
    } catch {
      // silent
    }
  }, []);

  const createThread = useCallback(async (payload: CreateThreadPayload) => {
    setSending(true);
    try {
      const res = await apiClient.post('/messaging/threads', payload);
      const raw = unwrapResponse<Record<string, unknown>>(res);
      const thread = mapThread((raw.thread ?? raw) as RawThread, userId);
      setThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
      return thread;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create thread'));
      return null;
    } finally {
      setSending(false);
    }
  }, [userId]);

  const sendMessage = useCallback(async (threadId: string, content: string) => {
    setSending(true);
    try {
      const res = await apiClient.post(`/messaging/threads/${threadId}/messages`, { content });
      const raw = unwrapResponse<Record<string, unknown>>(res);
      const msg = mapMessage(raw);
      setCurrentThread((prev) =>
        prev ? { ...prev, messages: [...prev.messages, msg], total: prev.total + 1 } : prev
      );
      // Update thread preview in list
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? { ...t, lastMessagePreview: content.slice(0, 100), lastMessageAt: msg.createdAt }
            : t
        )
      );
      return msg;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to send message'));
      return null;
    } finally {
      setSending(false);
    }
  }, []);

  const markAsRead = useCallback(async (threadId: string) => {
    try {
      await apiClient.patch(`/messaging/threads/${threadId}/read`);
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
      );
    } catch {
      // silent
    }
  }, []);

  const closeThread = useCallback(async (threadId: string) => {
    try {
      await apiClient.patch(`/messaging/threads/${threadId}/close`);
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, isClosed: true } : t))
      );
      setCurrentThread((prev) =>
        prev ? { ...prev, thread: { ...prev.thread, isClosed: true } } : prev
      );
      toast.success('Thread closed');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to close thread'));
    }
  }, []);

  return {
    threads, currentThread, unreadCount, loading, sending,
    loadThreads, loadThread, loadUnreadCount, createThread,
    sendMessage, markAsRead, closeThread,
  };
}
