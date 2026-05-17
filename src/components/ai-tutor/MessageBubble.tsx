'use client';

import { useState } from 'react';
import { Sparkles, Volume2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TutorMessage } from '@/types';
import { BuddyMarkdown } from './BuddyMarkdown';

interface MessageBubbleProps {
  message: TutorMessage;
  /** When true, render a blinking caret to indicate the reply is still streaming. */
  isStreaming?: boolean;
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isStudent = message.role === 'student';
  const [speaking, setSpeaking] = useState(false);

  const canSpeak =
    !isStudent &&
    !isStreaming &&
    typeof window !== 'undefined' &&
    'speechSynthesis' in window;

  const toggleSpeak = (): void => {
    if (!canSpeak) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    // Strip markdown/math so the speech sounds natural — TTS reads literal symbols otherwise.
    const cleaned = message.content
      .replace(/\$\$[\s\S]*?\$\$/g, ' ')
      .replace(/\$([^$\n]+)\$/g, ' $1 ')
      .replace(/[*_`#>]/g, '')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1');
    const utter = new SpeechSynthesisUtterance(cleaned);
    utter.rate = 1;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

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
            {isStudent ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <>
                <BuddyMarkdown content={message.content} />
                {isStreaming && <span className="ml-0.5 inline-block animate-pulse">▍</span>}
              </>
            )}
          </div>
          {!isStreaming && (
            <div
              className={`mt-1 flex items-center gap-2 text-xs text-muted-foreground ${
                isStudent ? 'justify-end' : 'justify-start'
              }`}
            >
              <span>{formatTime(message.timestamp)}</span>
              {canSpeak && (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={toggleSpeak}
                  className="h-6 w-6"
                  aria-label={speaking ? 'Stop reading' : 'Read aloud'}
                >
                  {speaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
