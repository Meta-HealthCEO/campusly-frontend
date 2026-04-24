'use client';

import { useState, useRef } from 'react';
import { Copy, Check, RefreshCw, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import type { ReportComment } from '@/types';

interface ReportCommentCardProps {
  comment: ReportComment;
  onTextChange: (studentId: string, text: string) => void;
  onSave: (id: string, text: string) => Promise<unknown>;
  onRegenerate: (id: string, wasEdited: boolean) => void;
  onDelete: (id: string) => void;
}

export function ReportCommentCard({
  comment,
  onTextChange,
  onSave,
  onRegenerate,
  onDelete,
}: ReportCommentCardProps) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(comment.finalText);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChange = (text: string) => {
    onTextChange(comment.studentId, text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!comment.id) return;
      setSaving(true);
      try {
        await onSave(comment.id, text);
      } finally {
        setSaving(false);
      }
    }, 1200);
  };

  const handleBlur = async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (!comment.id) return;
    setSaving(true);
    try {
      await onSave(comment.id, comment.finalText);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-2 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium truncate">{comment.studentName}</p>
            {comment.wasEdited && (
              <Badge variant="secondary" className="shrink-0">
                <Pencil className="mr-1 h-3 w-3" />
                Edited
              </Badge>
            )}
            {saving && (
              <span className="text-xs text-muted-foreground shrink-0">Saving…</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={handleCopy} title="Copy">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span className="sr-only">Copy</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRegenerate(comment.id, comment.wasEdited)}
              title="Regenerate"
            >
              <RefreshCw className="h-3 w-3" />
              <span className="sr-only">Regenerate</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(comment.id)}
              title="Delete"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
        <Textarea
          value={comment.finalText}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          rows={3}
        />
      </CardContent>
    </Card>
  );
}
