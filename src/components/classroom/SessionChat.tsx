'use client';

import { useRef, useEffect, useState } from 'react';
import { SendHorizontalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChatMessage } from '@/hooks/useClassroomSocket';

interface SessionChatProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  currentUserId: string;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SessionChat({ messages, onSend, currentUserId }: SessionChatProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full rounded-xl border bg-card overflow-hidden">
      <div className="border-b px-4 py-2">
        <p className="text-sm font-medium">Chat</p>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-6">No messages yet</p>
        )}
        {messages.map((msg, idx) => {
          const isOwn = msg.userId === currentUserId;
          return (
            <div key={idx} className="space-y-0.5">
              <div className="flex items-baseline gap-2">
                <span className={`text-xs font-semibold truncate max-w-30 ${isOwn ? 'text-primary' : ''}`}>
                  {isOwn ? 'You' : msg.name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <p className="text-sm wrap-break-word">{msg.text}</p>
            </div>
          );
        })}
      </div>

      <div className="border-t p-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={!draft.trim()} aria-label="Send message">
          <SendHorizontalIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
