import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  TutorConversation,
  TutorConversationSummary,
} from '@/types';

interface ParentMessagePayload {
  conversationId?: string;
  childId: string;
  message: string;
}

export function useParentAI() {
  const [conversations, setConversations] = useState<TutorConversationSummary[]>([]);
  const [currentConversation, setCurrentConversation] = useState<TutorConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/ai-tutor/parent/conversations');
      setConversations(unwrapList<TutorConversationSummary>(res));
    } catch (err: unknown) {
      console.error('Failed to load conversations');
      toast.error(extractErrorMessage(err, 'Failed to load conversations'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/ai-tutor/parent/conversations/${id}`);
      const raw = unwrapResponse(res);
      const conv = {
        ...(raw as Record<string, unknown>),
        id: (raw._id as string) ?? (raw.id as string),
      } as unknown as TutorConversation;
      setCurrentConversation(conv);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to load conversation'));
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (payload: ParentMessagePayload) => {
    setSending(true);
    try {
      const res = await apiClient.post('/ai-tutor/parent/chat', payload);
      const raw = unwrapResponse(res);
      const conv = {
        ...(raw as Record<string, unknown>),
        id: (raw._id as string) ?? (raw.id as string),
      } as unknown as TutorConversation;
      setCurrentConversation(conv);
      return conv;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to send message'));
      return null;
    } finally {
      setSending(false);
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setCurrentConversation(null);
  }, []);

  return {
    conversations,
    currentConversation,
    loading,
    sending,
    loadConversations,
    loadConversation,
    sendMessage,
    startNewConversation,
  };
}
