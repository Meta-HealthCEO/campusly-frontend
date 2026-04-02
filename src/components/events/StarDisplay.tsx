'use client';

import { Star } from 'lucide-react';

interface StarDisplayProps {
  rating: number;
  totalReviews?: number;
  size?: 'sm' | 'md';
}

export function StarDisplay({
  rating,
  totalReviews,
  size = 'sm',
}: StarDisplayProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${iconSize} ${
              star <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {rating > 0 ? rating.toFixed(1) : 'No ratings'}
        {totalReviews !== undefined && totalReviews > 0 && (
          <> ({totalReviews})</>
        )}
      </span>
    </div>
  );
}
