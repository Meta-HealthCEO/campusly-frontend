'use client';

import { Sparkles } from 'lucide-react';
import type { TutorMessage } from '@/types';

interface MessageBubbleProps {
  message: TutorMessage;
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isStudent = message.role === 'student';

  return (
    <div className={`flex ${isStudent ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`flex max-w-[85%] gap-2 sm:max-w-[70%] ${isStudent ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isStudent && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
        )}
        <div>
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isStudent
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <p
            className={`mt-1 text-xs text-muted-foreground ${
              isStudent ? 'text-right' : 'text-left'
            }`}
          >
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
}
