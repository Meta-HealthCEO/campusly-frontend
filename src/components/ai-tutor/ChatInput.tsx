'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Send, Loader2, X, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { AuraImagePayload } from '@/types';

interface ChatInputProps {
  onSend: (message: string, image?: AuraImagePayload) => void;
  disabled: boolean;
  /**
   * True only while a reply is actually in flight. Drives the spinner on the
   * send button. We distinguish this from `disabled` so the button doesn't
   * look like it's loading when it's really just waiting for a subject or
   * grade to be set.
   */
  sending?: boolean;
  placeholder?: string;
  initialValue?: string;
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB

export function ChatInput({ onSend, disabled, sending, placeholder, initialValue }: ChatInputProps) {
  const [text, setText] = useState(initialValue ?? '');
  const [image, setImage] = useState<{ payload: AuraImagePayload; previewUrl: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialValue) setText(initialValue);
    // Seed once on mount from the initial query-param context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Revoke object URL when the image changes/unmounts to avoid leaks.
  useEffect(() => {
    return () => {
      if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    };
  }, [image]);

  const handleSend = (): void => {
    const trimmed = text.trim();
    if ((!trimmed && !image) || disabled) return;
    onSend(trimmed || 'Please look at this image.', image?.payload);
    setText('');
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (value: string): void => {
    setText(value);
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type as AllowedMime)) {
      toast.error('Image must be a JPEG, PNG, or WebP');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be under 4 MB');
      return;
    }

    const base64 = await fileToBase64(file);
    setImage({
      payload: { mediaType: file.type as AllowedMime, base64 },
      previewUrl: URL.createObjectURL(file),
    });
  };

  const clearImage = (): void => {
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2 border-t bg-background p-3">
      {image && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2 pr-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.previewUrl}
            alt="Attached"
            className="h-12 w-12 rounded object-cover"
          />
          <span className="flex-1 text-xs text-muted-foreground">Photo attached</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={clearImage}
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <div className="mx-auto flex max-w-4xl items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_MIME.join(',')}
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach photo"
        >
          <ImagePlus className="h-4 w-4" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Type your message... (Shift+Enter for new line)'}
          disabled={disabled}
          className="min-h-[44px] max-h-40 resize-none rounded-lg"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !image)}
          size="icon"
          className="h-10 w-10 shrink-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="mx-auto flex max-w-4xl items-center justify-between px-12 text-[11px] text-muted-foreground">
        <span>Enter to send, Shift+Enter for a new line</span>
        <span className="hidden sm:inline">Attach a worksheet photo for step-by-step help</span>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected reader result type'));
        return;
      }
      // Strip the `data:image/...;base64,` prefix
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}
