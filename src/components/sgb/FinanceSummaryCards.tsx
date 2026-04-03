'use client';

import { DollarSign, TrendingDown, TrendingUp, Percent } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import type { FinanceSummary } from '@/types';

interface FinanceSummaryCardsProps {
  summary: FinanceSummary;
}

function formatZar(cents: number): string {
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

export function FinanceSummaryCards({ summary }: FinanceSummaryCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Income"
        value={formatZar(summary.income.totalIncome)}
        icon={TrendingUp}
        description={`Fees collected: ${formatZar(summary.income.totalFeesCollected)}`}
      />
      <StatCard
        title="Total Expenditure"
        value={formatZar(summary.expenditure.totalExpenditure)}
        icon={TrendingDown}
        description={`${summary.period} ${summary.year}`}
      />
      <StatCard
        title="Net Position"
        value={formatZar(summary.balance.netPosition)}
        icon={DollarSign}
        description={`Outstanding: ${formatZar(summary.balance.outstandingFees)}`}
      />
      <StatCard
        title="Collection Rate"
        value={`${summary.income.collectionRate}%`}
        icon={Percent}
        description={`Billed: ${formatZar(summary.income.totalFeesBilled)}`}
      />
    </div>
  );
}
