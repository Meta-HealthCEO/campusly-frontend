'use client';

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import type { PacingOverview } from '@/types/curriculum';

interface PacingOverviewCardsProps {
  summary: PacingOverview['summary'] | null;
}

export function PacingOverviewCards({ summary }: PacingOverviewCardsProps) {
  const onTrack = summary?.onTrack ?? 0;
  const slightlyBehind = summary?.slightlyBehind ?? 0;
  const significantlyBehind = summary?.significantlyBehind ?? 0;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      <StatCard
        title="On Track"
        value={String(onTrack)}
        icon={CheckCircle2}
        description="Plans progressing as expected"
        className="border-emerald-200"
      />
      <StatCard
        title="Slightly Behind"
        value={String(slightlyBehind)}
        icon={AlertTriangle}
        description="Plans needing attention"
        className="border-amber-200"
      />
      <StatCard
        title="Significantly Behind"
        value={String(significantlyBehind)}
        icon={XCircle}
        description="Plans requiring intervention"
        className="border-destructive/30"
      />
    </div>
  );
}
