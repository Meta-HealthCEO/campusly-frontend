'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, RotateCcw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLessonChat, type ChatMessage } from '@/hooks/useLessonChat';
import { cn } from '@/lib/utils';

interface Props {
  lessonId: string;
  className?: string;
}

const MAX_TEXTAREA_ROWS = 5;
const APPROX_LINE_HEIGHT_PX = 20;
const MIN_TEXTAREA_HEIGHT_PX = APPROX_LINE_HEIGHT_PX * 1 + 18;
const MAX_TEXTAREA_HEIGHT_PX = APPROX_LINE_HEIGHT_PX * MAX_TEXTAREA_ROWS + 18;

export function LessonChatPanel({ lessonId, className }: Props) {
  const { messages, send, pending, clear } = useLessonChat(lessonId);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to the latest message whenever messages or pending change.
  // Pending dependency catches the typing-indicator render so the indicator
  // is itself visible.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  // Auto-grow the textarea up to MAX_TEXTAREA_ROWS. Reset to auto first
  // so the scrollHeight measurement reflects only the current content.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const next = Math.min(
      Math.max(ta.scrollHeight, MIN_TEXTAREA_HEIGHT_PX),
      MAX_TEXTAREA_HEIGHT_PX,
    );
    ta.style.height = `${next}px`;
  }, [draft]);

  const handleSubmit = async () => {
    if (!draft.trim() || pending) return;
    const text = draft;
    setDraft('');
    await send(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter inserts a newline (standard chat UX).
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <section
      className={cn(
        'flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden',
        className,
      )}
      aria-label="Lesson assistant"
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
            <MessageSquare className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-semibold tracking-tight truncate">
            Lesson Assistant
          </h2>
        </div>
        {messages.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="text-xs text-muted-foreground"
            disabled={pending}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !pending && <EmptyState />}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {pending && <TypingIndicator />}
      </div>

      {/* Composer */}
      <footer className="border-t p-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this lesson..."
            rows={1}
            disabled={pending}
            className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <Button
            type="button"
            size="icon"
            onClick={() => void handleSubmit()}
            disabled={pending || !draft.trim()}
            aria-label="Send message"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 px-1">
          Enter to send · Shift+Enter for newline
        </p>
      </footer>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-10 px-4">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
        <MessageSquare className="h-6 w-6" />
      </span>
      <p className="text-sm text-muted-foreground">
        Ask me anything about this lesson — I have the topic, objectives,
        and your generated materials in context.
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words',
          isUser
            ? 'bg-primary/10 text-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-lg px-3 py-2 inline-flex items-center gap-1">
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="block h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
      style={{ animationDelay: delay }}
      aria-hidden="true"
    />
  );
}
