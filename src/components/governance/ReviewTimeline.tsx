'use client';

import { useMemo } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClipboardList } from 'lucide-react';
import type { SIPReview } from '@/types';

interface ReviewTimelineProps {
  reviews: SIPReview[];
}

const QUARTER_LABELS: Record<number, string> = {
  1: 'Q1',
  2: 'Q2',
  3: 'Q3',
  4: 'Q4',
};

function resolveReviewer(reviewedBy: SIPReview['reviewedBy']): string {
  if (typeof reviewedBy === 'string') return reviewedBy;
  return `${reviewedBy.firstName} ${reviewedBy.lastName}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function completionColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-700';
  if (pct >= 40) return 'text-amber-700';
  return 'text-destructive';
}

export function ReviewTimeline({ reviews }: ReviewTimelineProps) {
  const sorted = useMemo(
    () =>
      [...reviews].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.quarter - a.quarter;
      }),
    [reviews],
  );

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No reviews yet"
        description="Quarterly reviews will appear here once recorded."
      />
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium">Quarterly Reviews ({sorted.length})</h3>
      <ol className="relative border-l border-border ml-3 space-y-6">
        {sorted.map((review) => (
          <li key={review.id} className="ml-6">
            <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 ring-4 ring-background">
              <span className="text-xs font-bold text-primary">{QUARTER_LABELS[review.quarter] ?? `Q${review.quarter}`}</span>
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold">
                  {QUARTER_LABELS[review.quarter] ?? `Q${review.quarter}`} {review.year}
                </p>
                <span className={`text-sm font-medium ${completionColor(review.completionPercent)}`}>
                  {review.completionPercent}% complete
                </span>
              </div>
              {review.notes && (
                <p className="text-sm text-muted-foreground line-clamp-3">{review.notes}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Reviewed by {resolveReviewer(review.reviewedBy)} &middot; {formatDate(review.createdAt)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
