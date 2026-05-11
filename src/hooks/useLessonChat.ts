import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  reply: string;
}

export interface UseLessonChat {
  messages: ChatMessage[];
  send: (text: string) => Promise<void>;
  pending: boolean;
  clear: () => void;
}

/**
 * Manages a single in-memory chat conversation about a lesson.
 *
 * No persistence in v1 — reloading the page resets the chat. This is
 * intentional: chats are exploratory and the lesson state itself is the
 * source of truth.
 *
 * The send() flow optimistically appends the user message before awaiting
 * the AI reply, so the UI feels responsive. On error the user message is
 * left in place (so the teacher can see what they sent and retry) and
 * an inline assistant message surfaces the failure.
 */
export function useLessonChat(lessonId: string): UseLessonChat {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    // Snapshot history BEFORE appending the new user turn — the API expects
    // history to be the prior conversation only, with the new message
    // passed separately.
    const historySnapshot = messages;
    setMessages((prev) => [...prev, userMessage]);
    setPending(true);
    try {
      const res = await apiClient.post<{ data: ChatResponse }>(
        `/lessons/${lessonId}/chat`,
        { message: trimmed, history: historySnapshot },
      );
      const reply = res.data.data?.reply ?? '';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply || 'No reply.' },
      ]);
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry — the assistant is unavailable right now (${detail}).`,
        },
      ]);
    } finally {
      setPending(false);
    }
  }, [lessonId, messages, pending]);

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, send, pending, clear };
}
