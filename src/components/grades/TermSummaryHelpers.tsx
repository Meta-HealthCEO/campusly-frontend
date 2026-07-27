'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  TermSummaryAssessment,
  TermSummarySubjectColumn,
} from '@/hooks/useTermSummary';

export interface SubjectGroup {
  subject: TermSummarySubjectColumn;
  assessments: TermSummaryAssessment[];
}

export function gradeColor(pct: number | null): string {
  if (pct === null) return 'text-muted-foreground';
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 50) return 'text-foreground';
  return 'text-destructive';
}

export function deltaIcon(value: number | null, base: number | null) {
  if (value === null || base === null) return null;
  const diff = value - base;
  if (Math.abs(diff) < 1) {
    return <Minus className="h-3 w-3 text-muted-foreground" aria-label="On par with class" />;
  }
  if (diff > 0) {
    return <TrendingUp className="h-3 w-3 text-emerald-600" aria-label={`+${diff.toFixed(1)} vs class`} />;
  }
  return <TrendingDown className="h-3 w-3 text-destructive" aria-label={`${diff.toFixed(1)} vs class`} />;
}

export function CellMark({
  mark,
  base,
}: {
  mark: { mark: number; total: number; percent: number; isAbsent: boolean } | undefined;
  base: number | null;
}) {
  if (!mark) return <span className="text-xs text-muted-foreground">—</span>;
  if (mark.isAbsent) return <span className="text-xs text-muted-foreground">abs</span>;
  return (
    <div className="inline-flex items-center gap-1">
      <span className={cn('font-medium', gradeColor(mark.percent))}>{mark.percent}%</span>
      {deltaIcon(mark.percent, base)}
    </div>
  );
}
