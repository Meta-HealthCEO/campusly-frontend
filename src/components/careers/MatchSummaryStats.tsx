'use client';

import { StatCard } from '@/components/shared/StatCard';
import { CheckCircle2, Target, BarChart3 } from 'lucide-react';
import type { ProgrammeMatchSummary } from '@/types';

interface MatchSummaryStatsProps {
  summary: ProgrammeMatchSummary;
  studentAPS: number;
}

export function MatchSummaryStats({ summary, studentAPS }: MatchSummaryStatsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      <StatCard
        title="Eligible"
        value={String(summary.eligible)}
        icon={CheckCircle2}
        description={`of ${summary.total} programmes`}
      />
      <StatCard
        title="Close Match"
        value={String(summary.close)}
        icon={Target}
        description="Within reach with improvement"
      />
      <StatCard
        title="Your APS"
        value={String(studentAPS)}
        icon={BarChart3}
        description="Admission Point Score"
      />
    </div>
  );
}
