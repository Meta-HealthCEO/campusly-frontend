'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContentBlockItem } from '@/types';

const COPY_FEEDBACK_MS = 1500;

/**
 * Read-only code display block. `block.content` holds the code text;
 * `metadata.language` (optional) labels the header, `metadata.caption`
 * adds a description underneath.
 */
export function CodeBlock({ block }: { block: ContentBlockItem }) {
  const [copied, setCopied] = useState(false);
  const language = typeof block.metadata?.language === 'string' ? block.metadata.language : '';
  const caption = typeof block.metadata?.caption === 'string' ? block.metadata.caption : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(block.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // Clipboard unavailable (permissions / insecure context) — ignore.
    }
  };

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border bg-muted/50">
        <div className="flex items-center justify-between border-b bg-muted px-3 py-1.5">
          <span className="font-mono text-xs text-muted-foreground">
            {language || 'code'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={handleCopy}
            aria-label="Copy code"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
          <code className="font-mono">{block.content}</code>
        </pre>
      </div>
      {caption && (
        <p className="text-center text-xs text-muted-foreground">{caption}</p>
      )}
    </div>
  );
}
