'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/useAuthStore';

/* ── Exported types ─────────────────────────────────────────── */

export interface ChatMessage {
  userId: string;
  name: string;
  text: string;
  timestamp: string;
}

export interface HandRaise {
  userId: string;
  name: string;
  raisedAt: string;
}

export interface PollData {
  id: string;
  question: string;
  options: string[];
  createdBy: string;
}

export interface PollResponse {
  userId: string;
  optionIndex: number;
}

/* ── Derive socket URL from API URL ─────────────────────────── */

function getSocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4500/api';
  return apiUrl.replace(/\/api\/?$/, '');
}

/* ── Hook ────────────────────────────────────────────────────── */

export function useClassroomSocket(sessionId: string | null) {
  const tokens = useAuthStore((s) => s.tokens);
  const socketRef = useRef<Socket | null>(null);

  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [raisedHands, setRaisedHands] = useState<HandRaise[]>([]);
  const [activePoll, setActivePoll] = useState<PollData | null>(null);
  const [pollResponses, setPollResponses] = useState<PollResponse[]>([]);

  /* Connect / disconnect */
  useEffect(() => {
    if (!sessionId || !tokens?.accessToken) return;

    const socket = io(getSocketUrl(), {
      path: '/socket.io',
      auth: { token: tokens.accessToken },
      query: { sessionId },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('chat:message', (msg: ChatMessage) =>
      setMessages((prev) => [...prev, msg]),
    );

    socket.on('hand:raised', (hand: HandRaise) =>
      setRaisedHands((prev) => [...prev.filter((h) => h.userId !== hand.userId), hand]),
    );
    socket.on('hand:lowered', ({ userId }: { userId: string }) =>
      setRaisedHands((prev) => prev.filter((h) => h.userId !== userId)),
    );

    socket.on('poll:started', (poll: PollData) => {
      setActivePoll(poll);
      setPollResponses([]);
    });
    socket.on('poll:response', (resp: PollResponse) =>
      setPollResponses((prev) => [...prev.filter((r) => r.userId !== resp.userId), resp]),
    );
    socket.on('poll:ended', () => {
      setActivePoll(null);
      setPollResponses([]);
    });

    socket.emit('session:join', { sessionId });

    return () => {
      socket.emit('session:leave', { sessionId });
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [sessionId, tokens?.accessToken]);

  /* Action helpers */
  const emit = useCallback(
    (event: string, data: Record<string, unknown>) => {
      socketRef.current?.emit(event, { ...data, sessionId });
    },
    [sessionId],
  );

  const sendMessage = useCallback(
    (text: string) => emit('chat:send', { text }),
    [emit],
  );

  const raiseHand = useCallback(() => emit('hand:raise', {}), [emit]);
  const lowerHand = useCallback(() => emit('hand:lower', {}), [emit]);

  const createPoll = useCallback(
    (question: string, options: string[]) => emit('poll:create', { question, options }),
    [emit],
  );

  const respondPoll = useCallback(
    (optionIndex: number) => emit('poll:respond', { optionIndex }),
    [emit],
  );

  const endPoll = useCallback(() => emit('poll:end', {}), [emit]);

  return {
    connected,
    messages,
    raisedHands,
    activePoll,
    pollResponses,
    sendMessage,
    raiseHand,
    lowerHand,
    createPoll,
    respondPoll,
    endPoll,
  };
}
