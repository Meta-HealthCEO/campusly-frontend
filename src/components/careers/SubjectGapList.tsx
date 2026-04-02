'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import type { SubjectGap } from '@/types';

interface SubjectGapListProps {
  subjectGaps: SubjectGap[];
  missingSubjects: string[];
}

export function SubjectGapList({
  subjectGaps,
  missingSubjects,
}: SubjectGapListProps) {
  const hasIssues = subjectGaps.length > 0 || missingSubjects.length > 0;

  if (!hasIssues) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>All subject requirements met</span>
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {subjectGaps.map((gap: SubjectGap) => {
        const isMet = gap.actual >= gap.required;
        return (
          <li key={gap.subjectName} className="flex items-start gap-1.5 text-xs">
            {isMet ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
            )}
            <div className="min-w-0 flex-1">
              <span className="font-medium">{gap.subjectName}</span>
              <span className="text-muted-foreground">
                {' '}Required: {gap.required}% · Actual: {gap.actual}%
              </span>
              {!isMet && (
                <span className="text-destructive font-medium">
                  {' '}({gap.gap}% short)
                </span>
              )}
            </div>
          </li>
        );
      })}

      {missingSubjects.map((subject: string) => (
        <li key={subject} className="flex items-start gap-1.5 text-xs">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          <span className="text-destructive">Not taking {subject}</span>
        </li>
      ))}
    </ul>
  );
}
