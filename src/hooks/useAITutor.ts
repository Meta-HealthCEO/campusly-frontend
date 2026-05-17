import { useState, useCallback, useRef } from 'react';
import apiClient from '@/lib/api-client';
import { postEventStream } from '@/lib/sse-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  TutorConversation,
  TutorConversationSummary,
  TutorMessage,
  WeakArea,
  SendMessagePayload,
} from '@/types';

interface StreamEventMap {
  meta: { conversationId: string };
  delta: { text: string };
  done: TutorConversation & { _id?: string };
  error: { message: string };
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4500/api';
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function useAITutor() {
  const [conversations, setConversations] = useState<TutorConversationSummary[]>([]);
  const [currentConversation, setCurrentConversation] = useState<TutorConversation | null>(null);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  /** The assistant text being streamed for the in-flight reply. Empty when idle. */
  const [streamingText, setStreamingText] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/ai-tutor/conversations');
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
      const res = await apiClient.get(`/ai-tutor/conversations/${id}`);
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

  /**
   * Non-streaming send. Kept for callers that don't want progressive UI.
   * The streaming variant `sendMessageStream` is preferred from the chat page.
   */
  const sendMessage = useCallback(async (payload: SendMessagePayload) => {
    setSending(true);
    try {
      const res = await apiClient.post('/ai-tutor/chat', payload);
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

  /**
   * Stream a reply via SSE, painting tokens into the chat as they arrive.
   * The student message is appended optimistically; the assistant message
   * grows from `streamingText`. Once the server finalises the conversation,
   * we replace local state with the canonical version.
   */
  const sendMessageStream = useCallback(async (payload: SendMessagePayload) => {
    const token = getAccessToken();
    if (!token) {
      toast.error('You are signed out');
      return null;
    }

    setSending(true);
    setStreamingText('');

    // Optimistically show the student's message right away.
    setCurrentConversation((prev) => {
      if (!prev) return prev;
      const newStudentMsg: TutorMessage = {
        role: 'student',
        content: payload.message,
        timestamp: new Date().toISOString(),
      };
      return { ...prev, messages: [...prev.messages, newStudentMsg] };
    });

    const controller = new AbortController();
    abortRef.current = controller;
    let assistantBuffer = '';

    try {
      await postEventStream<StreamEventMap>(
        `${getApiBaseUrl()}/ai-tutor/chat/stream`,
        payload,
        { Authorization: `Bearer ${token}` },
        {
          signal: controller.signal,
          onError: (err) => {
            toast.error(err.message);
          },
          onEvent: (event, data) => {
            if (event === 'meta') {
              // First message in a new conversation: server tells us the id so
              // we can attach to subsequent sends without re-creating.
              const meta = data as StreamEventMap['meta'];
              setCurrentConversation((prev) => {
                if (prev) return prev;
                return {
                  id: meta.conversationId,
                  subjectId: payload.subjectId,
                  subjectName: payload.subjectName,
                  grade: payload.grade,
                  mode: payload.mode ?? 'chat',
                  title: payload.message.slice(0, 60),
                  messages: [
                    {
                      role: 'student',
                      content: payload.message,
                      timestamp: new Date().toISOString(),
                    },
                  ],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
              });
            } else if (event === 'delta') {
              const delta = data as StreamEventMap['delta'];
              assistantBuffer += delta.text;
              setStreamingText(assistantBuffer);
            } else if (event === 'done') {
              const finalRaw = data as StreamEventMap['done'];
              const finalConv = {
                ...(finalRaw as unknown as Record<string, unknown>),
                id: finalRaw._id ?? finalRaw.id,
              } as unknown as TutorConversation;
              setCurrentConversation(finalConv);
              setStreamingText('');
            } else if (event === 'error') {
              const errData = data as StreamEventMap['error'];
              toast.error(errData.message ?? 'Something went wrong');
            }
          },
        },
      );
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        toast.error(extractErrorMessage(err, 'Streaming failed'));
      }
    } finally {
      setSending(false);
      setStreamingText('');
      abortRef.current = null;
    }
    return null;
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const loadWeakAreas = useCallback(async () => {
    try {
      const res = await apiClient.get('/ai-tutor/weak-areas');
      setWeakAreas(unwrapList<WeakArea>(res));
    } catch (err: unknown) {
      console.error('Failed to load weak areas', err);
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setCurrentConversation(null);
    setStreamingText('');
  }, []);

  return {
    conversations,
    currentConversation,
    weakAreas,
    loading,
    sending,
    streamingText,
    loadConversations,
    loadConversation,
    sendMessage,
    sendMessageStream,
    stopStreaming,
    loadWeakAreas,
    startNewConversation,
  };
}
