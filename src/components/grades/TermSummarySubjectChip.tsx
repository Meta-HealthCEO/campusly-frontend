'use client';

import { Settings2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { gradeColor } from './TermSummaryHelpers';
import type { TermSummarySubjectColumn } from '@/hooks/useTermSummary';

interface SubjectChipProps {
  subject: TermSummarySubjectColumn;
  onOpenTrend: () => void;
  onConfigureWeightings: () => void;
}

// One subject card. Two surfaces:
//   • Body (clickable) → opens the per-term trend drilldown.
//   • Cog button (top-right) → opens the weightings config.
// When weightings aren't configured, the body's average is replaced with
// a destructive "Set weightings" prompt — there is no flat-average
// fallback by design (school policy must be set first).
export function TermSummarySubjectChip({
  subject, onOpenTrend, onConfigureWeightings,
}: SubjectChipProps) {
  const missing = subject.missingWeighting;
  return (
    <div className={cn(
      'group relative rounded-lg border bg-muted/10 transition-colors',
      missing ? 'border-destructive/40' : 'hover:border-primary/50 hover:bg-muted/30',
    )}>
      <button
        type="button"
        onClick={onOpenTrend}
        className="block w-full text-left px-3 py-2 pr-9"
        aria-label={`View trend for ${subject.subjectName}`}
      >
        <p className="text-sm font-medium truncate">{subject.subjectName}</p>
        {missing ? (
          <div className="mt-1 flex items-center gap-1 text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-medium">Set weightings</span>
          </div>
        ) : (
          <div className="mt-1 flex items-baseline gap-1">
            <span className={cn('text-xl font-semibold', gradeColor(subject.classAverage))}>
              {subject.classAverage !== null ? `${subject.classAverage}%` : '—'}
            </span>
            <span className="text-xs text-muted-foreground">class avg</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {subject.studentsWithMarks} marked · {subject.assessmentCount} test{subject.assessmentCount === 1 ? '' : 's'}
        </p>
      </button>
      <button
        type="button"
        onClick={onConfigureWeightings}
        className={cn(
          'absolute top-1.5 right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted',
          missing
            ? 'text-destructive opacity-100'
            : 'text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
        )}
        title="Configure weightings"
        aria-label={`Configure weightings for ${subject.subjectName}`}
      >
        <Settings2 className="h-4 w-4" />
      </button>
    </div>
  );
}
