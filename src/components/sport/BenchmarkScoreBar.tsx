'use client';

import { cn } from '@/lib/utils';

interface Props {
  testType: string;
  value: number;
  unit: string;
  score: number;
  benchmarkSummary?: string;
}

function tierColor(score: number): string {
  if (score >= 85) return 'from-purple-500 to-fuchsia-500';
  if (score >= 70) return 'from-yellow-400 to-amber-500';
  if (score >= 50) return 'from-slate-400 to-slate-500';
  return 'from-orange-700 to-orange-900';
}

function tierLabel(score: number): string {
  if (score >= 85) return 'Elite';
  if (score >= 70) return 'Gold';
  if (score >= 50) return 'Silver';
  return 'Bronze';
}

export function BenchmarkScoreBar({
  testType, value, unit, score, benchmarkSummary,
}: Props) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{testType.replace(/_/g, ' ')}</span>
        <span className="text-sm text-muted-foreground">
          <span className="font-mono">{value}</span> {unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r', tierColor(score))}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
        <span className="w-16 text-right text-xs">
          <span className="font-bold">{score}</span>
          <span className="ml-1 text-muted-foreground">{tierLabel(score)}</span>
        </span>
      </div>
      {benchmarkSummary && (
        <p className="text-[10px] text-muted-foreground">{benchmarkSummary}</p>
      )}
    </div>
  );
}
