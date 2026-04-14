'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  total: number;
  target?: number;
  label?: string;
}

export function WeightIndicator({ total, target = 100, label = 'Total weight' }: Props) {
  const isValid = Math.round(total) === target;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-sm font-medium',
        isValid ? 'text-green-600 dark:text-green-400' : 'text-destructive',
      )}
    >
      {isValid ? (
        <CheckCircle2 className="size-4 shrink-0" />
      ) : (
        <AlertCircle className="size-4 shrink-0" />
      )}
      <span>
        {label}: {total}%{' '}
        {isValid ? '✓' : `(must be ${target}%)`}
      </span>
    </div>
  );
}
