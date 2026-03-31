import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, mapId } from '@/lib/api-helpers';
import type { Message } from '@/types';

interface ParentMessagesResult {
  messages: Message[];
  loading: boolean;
  markAsRead: (messageId: string) => Promise<void>;
}

function mapNotificationToMessage(item: Record<string, unknown>): Message {
  return {
    id: (item._id as string) ?? (item.id as string) ?? '',
    senderId: (item.senderId as string) ?? '',
    sender: (item.sender as Message['sender']) ?? {
      id: '', email: '', firstName: 'School', lastName: 'Admin',
      role: 'admin' as const, schoolId: '', isActive: true,
      createdAt: '', updatedAt: '',
    },
    recipientIds: (item.recipientIds as string[]) ?? [],
    subject: (item.subject as string) ?? (item.title as string) ?? '',
    body: (item.body as string) ?? (item.message as string) ?? '',
    type: (item.type as Message['type']) ?? 'message',
    priority: (item.priority as Message['priority']) ?? 'normal',
    isRead: (item.isRead as boolean) ?? false,
    attachments: (item.attachments as string[]) ?? [],
    createdAt: (item.createdAt as string) ?? '',
  };
}

function mapAnnouncementToMessage(item: Record<string, unknown>): Message {
  return {
    id: (item._id as string) ?? (item.id as string) ?? '',
    senderId: '',
    sender: {
      id: '', email: '', firstName: 'School', lastName: '',
      role: 'admin' as const, schoolId: '', isActive: true,
      createdAt: '', updatedAt: '',
    },
    recipientIds: [],
    subject: (item.title as string) ?? '',
    body: (item.body as string) ?? (item.content as string) ?? '',
    type: 'announcement' as const,
    priority: 'normal' as const,
    isRead: false,
    attachments: [],
    createdAt: (item.createdAt as string) ?? '',
  };
}

export function useParentMessages(): ParentMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        let fetched: Message[] = [];
        try {
          const res = await apiClient.get('/notifications');
          const arr = unwrapList<Record<string, unknown>>(res);
          fetched = arr.map(mapNotificationToMessage);
        } catch {
          try {
            const res = await apiClient.get('/announcements/active');
            const arr = unwrapList<Record<string, unknown>>(res);
            fetched = arr.map(mapAnnouncementToMessage);
          } catch { /* no messages */ }
        }
        setMessages(fetched);
      } catch {
        console.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await apiClient.patch(`/notifications/${messageId}/read`);
      setMessages((prev) => prev.map((m) =>
        m.id === messageId ? { ...m, isRead: true } : m
      ));
    } catch {
      // Silently fail
    }
  }, []);

  return { messages, loading, markAsRead };
}
