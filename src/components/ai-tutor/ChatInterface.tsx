'use client';

import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import type { TutorConversation } from '@/types';

interface ChatInterfaceProps {
  conversation: TutorConversation | null;
  onSend: (message: string) => void;
  sending: boolean;
}

export function ChatInterface({ conversation, onSend, sending }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages]);

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-full bg-primary/10 p-6">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Tutor</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Select a subject and start chatting. I can help with homework, explain concepts,
              generate practice questions, and prepare you for exams.
            </p>
          </div>
        </div>
        <ChatInput onSend={onSend} disabled={sending} placeholder="Select a subject to begin..." />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold truncate">{conversation.title}</h3>
        <p className="text-xs text-muted-foreground">
          {conversation.subjectName} &middot; Grade {conversation.grade}
        </p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {conversation.messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 animate-pulse text-primary" />
            <span>Thinking...</span>
          </div>
        )}
      </div>
      <ChatInput onSend={onSend} disabled={sending} />
    </div>
  );
}
