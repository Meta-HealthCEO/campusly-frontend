'use client';

import { useEffect, useState, useRef, type KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  placeholder?: string;
  initialValue?: string;
}

export function ChatInput({ onSend, disabled, placeholder, initialValue }: ChatInputProps) {
  const [text, setText] = useState(initialValue ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialValue) setText(initialValue);
    // Seed once on mount from the initial query-param context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t bg-background p-3">
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Type your message... (Shift+Enter for new line)'}
        disabled={disabled}
        className="min-h-[44px] max-h-32 resize-none"
        rows={1}
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        size="icon"
        className="h-10 w-10 shrink-0"
      >
        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
