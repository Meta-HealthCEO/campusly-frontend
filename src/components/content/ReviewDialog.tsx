'use client';

import { useState, useEffect } from 'react';
import { BookOpen, FileText, PenTool, Lightbulb, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ContentResourceItem, ReviewPayload, ResourceType } from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<ResourceType, React.ElementType> = {
  lesson: BookOpen,
  study_notes: FileText,
  worksheet: PenTool,
  worked_example: Lightbulb,
  activity: Zap,
};

const TYPE_LABELS: Record<ResourceType, string> = {
  lesson: 'Lesson',
  study_notes: 'Study Notes',
  worksheet: 'Worksheet',
  worked_example: 'Worked Example',
  activity: 'Activity',
};

function resolveCreatorName(creator: ContentResourceItem['createdBy']): string {
  if (!creator) return 'Unknown';
  if (typeof creator === 'string') return creator;
  return `${creator.firstName} ${creator.lastName}`;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: ContentResourceItem | null;
  onSubmit: (id: string, payload: ReviewPayload) => Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReviewDialog({
  open,
  onOpenChange,
  resource,
  onSubmit,
}: ReviewDialogProps) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNotes('');
      setSubmitting(false);
    }
  }, [open]);

  if (!resource) return null;

  const Icon = TYPE_ICONS[resource.type];
  const creatorName = resolveCreatorName(resource.createdBy);

  const handleAction = async (action: 'approve' | 'reject') => {
    setSubmitting(true);
    try {
      await onSubmit(resource.id, {
        action,
        notes: notes || undefined,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Review submission failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Review Resource</DialogTitle>
          <DialogDescription>
            Approve or reject this resource for the content library.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          {/* Resource summary */}
          <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium truncate">{resource.title}</h4>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Type: {TYPE_LABELS[resource.type]}</span>
                <span>By: {creatorName}</span>
                <span>Blocks: {resource.blocks.length}</span>
              </div>
            </div>
          </div>

          {/* Review notes */}
          <div>
            <Label htmlFor="review-notes">Review Notes</Label>
            <Textarea
              id="review-notes"
              rows={4}
              placeholder="Add feedback or notes for the author..."
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNotes(e.target.value)
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={submitting}
            onClick={() => handleAction('reject')}
          >
            {submitting ? 'Submitting...' : 'Reject'}
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => handleAction('approve')}
          >
            {submitting ? 'Submitting...' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
