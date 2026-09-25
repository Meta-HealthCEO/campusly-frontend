'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resetLabel, usageLine, type AIAllowanceUsage } from '@/lib/ai-allowance';

interface AIUsageMeterProps {
  usage: AIAllowanceUsage;
  /** A one-line notice for next to AI buttons, instead of the Billing card. */
  compact?: boolean;
}

/** How many of this month's AI actions are left: on Billing, and next to AI buttons when few remain. */
export function AIUsageMeter({ usage, compact = false }: AIUsageMeterProps) {
  const left = Math.max(0, usage.limit - usage.used);
  const usedPct = Math.min(100, Math.round((usage.used / Math.max(1, usage.limit)) * 100));
  const reset = resetLabel(usage.resetsAt, new Date());

  if (compact) {
    return (
      <div
        role="status"
        className={cn(
          'flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between',
          left === 0 ? 'border-destructive bg-destructive-soft text-destructive' : 'border-attention bg-attention-soft text-attention',
        )}
      >
        <p className="flex items-center gap-2">
          <Sparkles className="size-4 shrink-0" aria-hidden />
          <span>{usageLine(usage)}. {reset}.</span>
        </p>
        {usage.plan === 'free' ? (
          <Link href="/my/billing" className="inline-flex min-h-11 items-center font-medium underline underline-offset-2 sm:min-h-0">
            Upgrade to Pro
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <p className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums">{left}</span>
        <span className="text-sm text-muted-foreground">of {usage.limit} left</span>
      </p>
      <div
        role="progressbar"
        aria-label="AI actions used this month"
        aria-valuemin={0}
        aria-valuemax={usage.limit}
        aria-valuenow={Math.min(usage.used, usage.limit)}
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn('h-full rounded-full transition-transform', left === 0 ? 'bg-destructive' : left < 5 ? 'bg-attention' : 'bg-primary')}
          style={{ width: `${usedPct}%` }}
        />
      </div>
      <p className="mt-2 text-sm">{usageLine(usage)}</p>
      <p className="text-xs text-muted-foreground">
        {reset}. Every AI action counts once: drafting a lesson outline, writing its items, a test paper, a memo, marking a script, drafting homework.
      </p>
    </div>
  );
}
