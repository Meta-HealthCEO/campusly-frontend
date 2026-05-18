'use client';

import { useState } from 'react';
import { Check, Copy, MoreHorizontal, Sparkles, Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TutorMessage } from '@/types';
import { AuraMarkdown } from './AuraMarkdown';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: TutorMessage;
  isStreaming?: boolean;
  onFollowUp?: (prompt: string) => void;
}

const FOLLOW_UP_PROMPTS = [
  { label: 'Explain it simpler', prompt: 'Explain that more simply, like I am hearing it for the first time.' },
  { label: 'Give me an example', prompt: 'Give me a concrete worked example for what you just said.' },
  { label: 'Quiz me on this', prompt: 'Ask me one question to check if I understood that.' },
];

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function MessageBubble({ message, isStreaming, onFollowUp }: MessageBubbleProps) {
  const isStudent = message.role === 'student';
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);

  const canSpeak =
    !isStudent &&
    !isStreaming &&
    typeof window !== 'undefined' &&
    'speechSynthesis' in window;

  const handleCopy = async (): Promise<void> => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const toggleSpeak = (): void => {
    if (!canSpeak) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
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
    <div className={cn('group/msg mb-4 flex', isStudent ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'flex max-w-[92%] gap-3',
          isStudent ? 'flex-row-reverse sm:max-w-[78%]' : 'flex-row sm:max-w-[88%]',
        )}
      >
        {!isStudent && (
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
        )}

        <div className={cn('min-w-0', isStudent && 'flex flex-col items-end')}>
          <div
            className={cn(
              'rounded-lg px-4 py-3 text-sm leading-relaxed shadow-sm',
              isStudent
                ? 'bg-primary text-primary-foreground'
                : 'border bg-card text-foreground',
            )}
          >
            {isStudent ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <>
                <AuraMarkdown content={message.content} />
                {isStreaming && <span className="ml-0.5 inline-block animate-pulse">|</span>}
              </>
            )}
          </div>

          {!isStreaming && (
            <div
              className={cn(
                'mt-1 flex items-center gap-0.5 text-[11px] text-muted-foreground',
                isStudent ? 'justify-end' : 'justify-start',
                // Hide on desktop until the message is hovered/focused; always
                // show on touch screens (no hover state available).
                'opacity-0 transition-opacity duration-100',
                'group-hover/msg:opacity-100 focus-within:opacity-100',
                '[@media(hover:none)]:opacity-100',
              )}
            >
              <span className="px-1">{formatTime(message.timestamp)}</span>
              {!isStudent && (
                <>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    onClick={handleCopy}
                    aria-label="Copy reply"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                  {canSpeak && (
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      onClick={toggleSpeak}
                      aria-label={speaking ? 'Stop reading' : 'Read aloud'}
                    >
                      {speaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                    </Button>
                  )}
                  {onFollowUp && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            aria-label="More follow-up prompts"
                          />
                        }
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        {FOLLOW_UP_PROMPTS.map((item) => (
                          <DropdownMenuItem
                            key={item.label}
                            onClick={() => onFollowUp(item.prompt)}
                          >
                            {item.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
