'use client';

import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import type { BuddyImagePayload, TutorConversation } from '@/types';

interface ChatInterfaceProps {
  conversation: TutorConversation | null;
  onSend: (message: string, image?: BuddyImagePayload) => void;
  sending: boolean;
  canChat: boolean;
  /** Live token-stream of the in-flight assistant reply (empty when idle). */
  streamingText?: string;
  initialPrompt?: string;
}

export function ChatInterface({
  conversation,
  onSend,
  sending,
  canChat,
  streamingText,
  initialPrompt,
}: ChatInterfaceProps) {
  const seededInput = initialPrompt ? `Help me understand: ${initialPrompt}` : undefined;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages, streamingText]);

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-full bg-primary/10 p-6">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Buddy — your AI tutor</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Pick a subject and tell me what you want help with. I can explain ideas, walk you
              through homework hints, give you practice questions, or help you prep for a test.
            </p>
          </div>
        </div>
        <ChatInput
          onSend={onSend}
          disabled={sending || !canChat}
          placeholder={canChat ? 'Ask me anything...' : 'Select a subject to begin...'}
          initialValue={seededInput}
        />
      </div>
    );
  }

  const isStreaming = sending && Boolean(streamingText);

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold truncate">{conversation.title}</h3>
        <p className="text-xs text-muted-foreground">
          {conversation.subjectName} &middot; Grade {conversation.grade} &middot; {modeLabel(conversation.mode)}
        </p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {conversation.messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {isStreaming && (
          <MessageBubble
            message={{
              role: 'assistant',
              content: streamingText ?? '',
              timestamp: new Date().toISOString(),
            }}
            isStreaming
          />
        )}
        {sending && !isStreaming && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 animate-pulse text-primary" />
            <span>Thinking...</span>
          </div>
        )}
      </div>
      <ChatInput onSend={onSend} disabled={sending || !canChat} initialValue={seededInput} />
    </div>
  );
}

function modeLabel(mode: TutorConversation['mode']): string {
  switch (mode) {
    case 'homework_help':
      return 'Homework help';
    case 'practice':
      return 'Practice';
    case 'exam_prep':
      return 'Exam prep';
    default:
      return 'Explain';
  }
}
