'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type ReviewStatus = 'approved' | 'changes_requested';

interface ModerationReviewFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (status: ReviewStatus, comments: string) => Promise<void>;
  submitting: boolean;
}

export function ModerationReviewForm({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: ModerationReviewFormProps) {
  const [status, setStatus] = useState<ReviewStatus>('approved');
  const [comments, setComments] = useState('');

  async function handleSubmit() {
    await onSubmit(status, comments);
    setComments('');
    setStatus('approved');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review Paper</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Decision</Label>
            <RadioGroup
              value={status}
              onValueChange={(val: unknown) => setStatus(val as ReviewStatus)}
              className="gap-3"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="approved" id="review-approved" />
                <Label htmlFor="review-approved" className="cursor-pointer font-normal">
                  Approve
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="changes_requested" id="review-changes" />
                <Label htmlFor="review-changes" className="cursor-pointer font-normal">
                  Request Changes
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-comments" className="text-sm font-medium">
              Comments
            </Label>
            <Textarea
              id="review-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={5}
              placeholder="Provide feedback or notes for the teacher..."
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
