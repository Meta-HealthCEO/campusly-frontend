'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { TYPE_LABELS, CAPS_LABELS } from './question-constants';
import type { QuestionItem, ReviewQuestionPayload } from '@/types/question-bank';

// ─── Props ──────────────────────────────────────────────────────────────────

interface QuestionReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: QuestionItem | null;
  onSubmit: (id: string, payload: ReviewQuestionPayload) => Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function QuestionReviewDialog({
  open,
  onOpenChange,
  question,
  onSubmit,
}: QuestionReviewDialogProps) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNotes('');
      setSubmitting(false);
    }
  }, [open]);

  if (!question) return null;

  const handleAction = async (action: 'approve' | 'reject') => {
    setSubmitting(true);
    try {
      await onSubmit(question.id, { action, notes: notes || undefined });
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Review submission failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Question</DialogTitle>
          <DialogDescription>
            Approve or reject this question for the question bank.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          {/* Question summary */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-sm">{question.stem}</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{TYPE_LABELS[question.type]}</Badge>
              <Badge variant="outline">[{question.marks} marks]</Badge>
              <Badge variant="outline">
                CAPS: {CAPS_LABELS[question.cognitiveLevel.caps]}
              </Badge>
              <Badge variant="outline">
                Blooms: {question.cognitiveLevel.blooms}
              </Badge>
              <Badge variant="outline">Difficulty: {question.difficulty}/5</Badge>
            </div>
          </div>

          {/* Answer preview */}
          {question.answer && (
            <div>
              <Label className="text-muted-foreground">Model Answer</Label>
              <p className="mt-1 text-sm rounded-lg border bg-muted/20 p-2">
                {question.answer}
              </p>
            </div>
          )}

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
