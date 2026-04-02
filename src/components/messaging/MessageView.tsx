'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, ArrowLeft, Lock, CheckCheck, Check } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { MessageThread, ThreadMessage } from '@/types';

interface MessageViewProps {
  thread: MessageThread;
  messages: ThreadMessage[];
  onSend: (content: string) => void;
  sending: boolean;
  currentUserId: string;
  onClose?: () => void;
  onBack?: () => void;
}

function getOtherParticipant(thread: MessageThread, currentUserId: string) {
  return thread.participants.find((p) => p.userId !== currentUserId)
    ?? thread.participants[0];
}

export function MessageView({
  thread, messages, onSend, sending, currentUserId, onClose, onBack,
}: MessageViewProps) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const other = getOtherParticipant(thread, currentUserId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 lg:hidden">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{other?.name ?? 'Unknown'}</span>
            {thread.isClosed && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Lock className="h-3 w-3" /> Closed
              </Badge>
            )}
          </div>
          {thread.studentName && (
            <p className="text-xs text-muted-foreground">Re: {thread.studentName}</p>
          )}
          {thread.subject && (
            <p className="text-xs text-muted-foreground truncate">{thread.subject}</p>
          )}
        </div>
        {onClose && !thread.isClosed && (
          <Button variant="outline" size="sm" onClick={onClose}>
            <Lock className="mr-1 h-3 w-3" /> Close
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMine = msg.senderId === currentUserId;
          const isRead = msg.readBy.length > 0;

          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3 py-2 ${
                  isMine
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted rounded-bl-sm'
                }`}
              >
                {!isMine && (
                  <p className="text-[10px] font-medium mb-0.5 opacity-70">
                    {msg.senderName}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                  <span className="text-[10px] opacity-60">
                    {msg.createdAt && formatDate(msg.createdAt, 'HH:mm')}
                  </span>
                  {isMine && (
                    isRead
                      ? <CheckCheck className="h-3 w-3 opacity-60" />
                      : <Check className="h-3 w-3 opacity-40" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!thread.isClosed ? (
        <div className="border-t p-3">
          <div className="flex gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="min-h-[40px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={sending || !draft.trim()}
              size="icon"
              className="shrink-0 self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t p-3 text-center text-sm text-muted-foreground">
          This conversation has been closed.
        </div>
      )}
    </div>
  );
}
