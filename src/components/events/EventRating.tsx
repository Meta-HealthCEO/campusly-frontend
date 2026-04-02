'use client';

import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface EventRatingProps {
  onSubmit: (rating: number, comment?: string) => Promise<void>;
  onSuccess?: () => void;
}

export function EventRating({ onSubmit, onSuccess }: EventRatingProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const displayRating = hoveredRating || rating;

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(rating, comment || undefined);
      toast.success('Feedback submitted');
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to submit feedback',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">Your Rating</Label>
        <div className="flex gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="focus:outline-none"
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  star <= displayRating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="event-comment" className="text-sm font-medium">
          Comment (optional)
        </Label>
        <Textarea
          id="event-comment"
          placeholder="Share your experience..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {comment.length}/1000 characters
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className="w-full sm:w-auto"
      >
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Feedback
      </Button>
    </div>
  );
}
