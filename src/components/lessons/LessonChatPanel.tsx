'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, RotateCcw, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLessonChat, type ChatMessage } from '@/hooks/useLessonChat';
import { cn } from '@/lib/utils';

interface Props {
  lessonId: string;
  className?: string;
}

const MAX_TEXTAREA_ROWS = 6;
const APPROX_LINE_HEIGHT_PX = 22;
const MIN_TEXTAREA_HEIGHT_PX = APPROX_LINE_HEIGHT_PX + 20;
const MAX_TEXTAREA_HEIGHT_PX = APPROX_LINE_HEIGHT_PX * MAX_TEXTAREA_ROWS + 20;

const SUGGESTIONS: string[] = [
  'Suggest 3 worked examples for this topic',
  'What are common student misconceptions?',
  'Give me a quick starter activity for the introduction',
  'How could I assess understanding in 5 minutes?',
];

export function LessonChatPanel({ lessonId, className }: Props) {
  const { messages, send, pending, clear } = useLessonChat(lessonId);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRefActive = useRef<HTMLTextAreaElement>(null);
  const textareaRefEmpty = useRef<HTMLTextAreaElement>(null);

  const hasConversation = messages.length > 0 || pending;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  // Auto-grow whichever textarea is currently mounted.
  useEffect(() => {
    const ta = hasConversation ? textareaRefActive.current : textareaRefEmpty.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const next = Math.min(
      Math.max(ta.scrollHeight, MIN_TEXTAREA_HEIGHT_PX),
      MAX_TEXTAREA_HEIGHT_PX,
    );
    ta.style.height = `${next}px`;
  }, [draft, hasConversation]);

  const handleSubmit = async (override?: string) => {
    const text = (override ?? draft).trim();
    if (!text || pending) return;
    setDraft('');
    await send(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
            <MessageSquare className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-semibold tracking-tight truncate">
            Lesson Assistant
          </h2>
        </div>
        {hasConversation && (
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

      {!hasConversation ? (
        <EmptyHero
          draft={draft}
          setDraft={setDraft}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          textareaRef={textareaRefEmpty}
          pending={pending}
          onPickSuggestion={(s) => void handleSubmit(s)}
        />
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => <MessageBubble key={i} message={m} />)}
            {pending && <TypingIndicator />}
          </div>
          <ActiveComposer
            draft={draft}
            setDraft={setDraft}
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
            textareaRef={textareaRefActive}
            pending={pending}
          />
        </>
      )}
    </section>
  );
}

interface ComposerCommonProps {
  draft: string;
  setDraft: (s: string) => void;
  onSubmit: (override?: string) => void | Promise<void>;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  pending: boolean;
}

interface EmptyHeroProps extends ComposerCommonProps {
  onPickSuggestion: (text: string) => void;
}

function EmptyHero({
  draft,
  setDraft,
  onSubmit,
  onKeyDown,
  textareaRef,
  pending,
  onPickSuggestion,
}: EmptyHeroProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-6">
      <div className="w-full max-w-md mx-auto space-y-5">
        <div className="text-center space-y-2">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1">
            <Sparkles className="h-6 w-6" />
          </span>
          <h3 className="text-base font-semibold tracking-tight">
            How can I help with this lesson?
          </h3>
          <p className="text-xs text-muted-foreground">
            I have the topic, objectives, generated materials, and the matched
            textbook chapter in context.
          </p>
        </div>

        <ComposerBox
          draft={draft}
          setDraft={setDraft}
          onSubmit={onSubmit}
          onKeyDown={onKeyDown}
          textareaRef={textareaRef}
          pending={pending}
          autoFocus
        />

        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-1">
            Try
          </p>
          <div className="flex flex-col gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onPickSuggestion(s)}
                disabled={pending}
                className="text-left text-xs rounded-md border border-input bg-background hover:bg-muted/60 hover:border-primary/30 px-3 py-2 transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActiveComposer(props: ComposerCommonProps) {
  return (
    <footer className="border-t bg-card/95 backdrop-blur-sm p-3 shrink-0">
      <ComposerBox {...props} />
      <p className="text-[10px] text-muted-foreground mt-2 px-1">
        Enter to send · Shift+Enter for newline
      </p>
    </footer>
  );
}

function ComposerBox({
  draft,
  setDraft,
  onSubmit,
  onKeyDown,
  textareaRef,
  pending,
  autoFocus,
}: ComposerCommonProps & { autoFocus?: boolean }) {
  return (
    <div className="flex gap-2 items-end rounded-xl border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring transition-all">
      <textarea
        ref={textareaRef}
        autoFocus={autoFocus}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask about this lesson..."
        rows={1}
        disabled={pending}
        className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-5 focus:outline-none disabled:opacity-50"
      />
      <Button
        type="button"
        size="icon"
        onClick={() => void onSubmit()}
        disabled={pending || !draft.trim()}
        aria-label="Send message"
        className="shrink-0 h-8 w-8"
      >
        <Send className="h-4 w-4" />
      </Button>
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
