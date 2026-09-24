'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { canSendChangeRequest, MAX_REVIEW_COMMENT } from '@/lib/moderation';

interface RequestChangesDialogProps {
  open: boolean;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (comments: string) => Promise<void>;
}

/** Mount with a `key` per paper so each opening starts with an empty note. */
export function RequestChangesDialog({ open, submitting, onOpenChange, onSend }: RequestChangesDialogProps) {
  const [comments, setComments] = useState('');
  const ready = canSendChangeRequest(comments);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col">
        <DialogHeader>
          <DialogTitle>Request changes</DialogTitle>
          <DialogDescription>The teacher sees this note with their paper.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-2 overflow-y-auto py-4">
          <Label htmlFor="request-changes-note">
            What needs to change? <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="request-changes-note"
            rows={5}
            maxLength={MAX_REVIEW_COMMENT}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="For example: question 4 is above Grade 7 level; swap it for a term 2 question."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!ready || submitting} onClick={() => { void onSend(comments.trim()); }}>
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
