'use client';

import { useEffect, useMemo, useRef } from 'react';
import { BookOpen, Lightbulb, Pause, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { cn } from '@/lib/utils';
import type { AuraImagePayload, TutorConversation, TutorMode } from '@/types';

interface ChatInterfaceProps {
  conversation: TutorConversation | null;
  onSend: (message: string, image?: AuraImagePayload) => void;
  onQuickPrompt?: (message: string) => void;
  onStop?: () => void;
  sending: boolean;
  canChat: boolean;
  streamingText?: string;
  initialPrompt?: string;
  mode?: TutorMode;
  subjectName?: string;
  grade?: number;
  /** Kept for parent-flow compatibility; not rendered now that chips live in the page header. */
  modeLabel?: string;
}

const TUTOR_STARTERS: Array<{
  title: string;
  description: string;
  icon: typeof Lightbulb;
  prompt: string;
}> = [
  {
    title: 'Teach me this',
    description: 'A short lesson + one check question.',
    icon: BookOpen,
    prompt: 'Give me a tiny lesson on this topic. Keep it simple, then ask me one check question.',
  },
  {
    title: 'Hint me',
    description: 'Smallest possible nudge first.',
    icon: Lightbulb,
    prompt: 'Guide me with hints only. Start with the smallest possible hint.',
  },
  {
    title: 'Quiz me',
    description: 'One question at a time with feedback.',
    icon: Target,
    prompt: 'Test my understanding with one question. Wait for my answer before explaining.',
  },
];

export function ChatInterface({
  conversation,
  onSend,
  onQuickPrompt,
  onStop,
  sending,
  canChat,
  streamingText,
  initialPrompt,
  mode = 'chat',
  subjectName = '',
  grade = 0,
}: ChatInterfaceProps) {
  const seededInput = initialPrompt ? `Help me understand: ${initialPrompt}` : undefined;
  const scrollRef = useRef<HTMLDivElement>(null);
  const isStreaming = sending && Boolean(streamingText);
  const hasMessages = Boolean(conversation?.messages.length);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages, streamingText]);

  const placeholder = useMemo(() => {
    if (!canChat && grade < 1) return 'Join a class to begin...';
    if (!canChat) return 'Pick a subject to begin...';
    if (mode === 'homework_help') return 'Paste the question or attach a photo — Aura hints first';
    if (mode === 'practice') return 'What topic do you want to practise?';
    if (mode === 'exam_prep') return 'Which test or topic are you preparing for?';
    return 'Ask Aura anything about your school work';
  }, [canChat, grade, mode]);

  const sendQuickPrompt = (prompt: string) => {
    if (!canChat) return;
    if (onQuickPrompt) {
      onQuickPrompt(prompt);
      return;
    }
    onSend(prompt);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-background">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          <EmptyTutorState
            canChat={canChat}
            subjectName={subjectName}
            onPrompt={sendQuickPrompt}
          />
        ) : (
          <div className="mx-auto max-w-3xl px-4 py-4">
            {conversation?.messages.map((msg, i) => (
              <MessageBubble
                key={`${msg.timestamp}-${i}`}
                message={msg}
                onFollowUp={msg.role === 'assistant' ? sendQuickPrompt : undefined}
              />
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
              <div className="mb-3 flex items-center gap-2 px-1 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                <span>Aura is thinking</span>
                {onStop && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={onStop}
                    className="ml-auto"
                  >
                    <Pause className="h-3 w-3" />
                    Stop
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <ChatInput
        onSend={onSend}
        disabled={sending || !canChat}
        sending={sending}
        placeholder={placeholder}
        initialValue={seededInput}
      />
    </div>
  );
}

interface EmptyTutorStateProps {
  canChat: boolean;
  subjectName: string;
  onPrompt: (prompt: string) => void;
}

function EmptyTutorState({ canChat, subjectName, onPrompt }: EmptyTutorStateProps) {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col justify-center px-4 py-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          What can I help you with?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {subjectName
            ? `Ask anything about ${subjectName}, or pick a starter below.`
            : 'Pick a subject in the header, then ask anything.'}
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {TUTOR_STARTERS.map((starter) => {
          const Icon = starter.icon;
          return (
            <button
              key={starter.title}
              type="button"
              disabled={!canChat}
              onClick={() => onPrompt(starter.prompt)}
              className={cn(
                'rounded-lg border bg-card p-4 text-left transition',
                'hover:border-primary/50 hover:bg-accent',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              <Icon className="mb-2 h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">{starter.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{starter.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
