'use client';

import { cn } from '@/lib/utils';

interface UsageLimitBarProps {
  used: number;
  limit: number;
  label?: string;
}

export function UsageLimitBar({ used, limit, label }: UsageLimitBarProps) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isWarning = pct > 80;

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span>{used} / {limit}</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={cn(
            'h-2 rounded-full transition-all',
            isWarning ? 'bg-amber-500' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
