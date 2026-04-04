'use client';

import { useState } from 'react';
import { X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UsageData, UsageMetric } from '@/hooks/useUsage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMetric(metric: UsageMetric): string {
  const limit = metric.limit === -1 ? '∞' : String(metric.limit);
  return `${metric.current}/${limit}`;
}

function isNearLimit(metric: UsageMetric): boolean {
  if (metric.limit === -1) return false;
  return metric.current / metric.limit >= 0.8;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface UsageBannerProps {
  data: UsageData;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UsageBanner({ data }: UsageBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || data.plan !== 'free') return null;

  const { aiGenerations, resources } = data.usage;
  const anyNearLimit = isNearLimit(aiGenerations) || isNearLimit(resources);

  return (
    <div
      className={
        'flex flex-col gap-2 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ' +
        (anyNearLimit
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-primary/20 bg-primary/5')
      }
    >
      <div className="flex items-start gap-3 sm:items-center">
        <Zap
          className={
            'mt-0.5 size-4 shrink-0 sm:mt-0 ' +
            (anyNearLimit ? 'text-destructive' : 'text-primary')
          }
        />
        <p className="text-sm">
          <span className="font-medium">Free Plan</span>
          {' — '}
          <span
            className={isNearLimit(aiGenerations) ? 'text-destructive font-medium' : undefined}
          >
            {formatMetric(aiGenerations)} AI generations today
          </span>
          {' | '}
          <span
            className={isNearLimit(resources) ? 'text-destructive font-medium' : undefined}
          >
            {formatMetric(resources)} resources
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => {
            // Upgrade flow — contact admin or navigate to billing
          }}
        >
          Upgrade for unlimited access
        </Button>
        <button
          type="button"
          aria-label="Dismiss usage banner"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
