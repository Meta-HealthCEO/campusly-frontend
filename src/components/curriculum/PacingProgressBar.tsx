'use client';

import { cn } from '@/lib/utils';
import type { CurriculumPacingStatus } from '@/types/curriculum';

interface PacingProgressBarProps {
  actual: number;
  expected: number;
  status: CurriculumPacingStatus;
}

const actualBarColor: Record<CurriculumPacingStatus, string> = {
  on_track: 'bg-emerald-500',
  slightly_behind: 'bg-amber-500',
  significantly_behind: 'bg-destructive',
};

export function PacingProgressBar({ actual, expected, status }: PacingProgressBarProps) {
  const clampedActual = Math.min(Math.max(actual, 0), 100);
  const clampedExpected = Math.min(Math.max(expected, 0), 100);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Expected</span>
          <span className="font-medium">{clampedExpected}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-muted-foreground/40 transition-all duration-300"
            style={{ width: `${clampedExpected}%` }}
          />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Actual</span>
          <span className={cn('font-medium', {
            'text-emerald-700': status === 'on_track',
            'text-amber-700': status === 'slightly_behind',
            'text-destructive': status === 'significantly_behind',
          })}>
            {clampedActual}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all duration-300', actualBarColor[status])}
            style={{ width: `${clampedActual}%` }}
          />
        </div>
      </div>
    </div>
  );
}
