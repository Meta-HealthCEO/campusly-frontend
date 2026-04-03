'use client';

import { StatCard } from '@/components/shared/StatCard';
import { DollarSign, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Budget } from '@/types';

interface BudgetSummaryCardsProps {
  budget: Budget | null;
  totalExpenses: number;
}

export function BudgetSummaryCards({ budget, totalExpenses }: BudgetSummaryCardsProps) {
  const totalBudgeted = budget?.totalBudgeted ?? 0;
  const remaining = totalBudgeted - totalExpenses;
  const utilization = totalBudgeted > 0
    ? Math.round((totalExpenses / totalBudgeted) * 1000) / 10
    : 0;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Budgeted"
        value={formatCurrency(totalBudgeted)}
        icon={DollarSign}
      />
      <StatCard
        title="Total Spent"
        value={formatCurrency(totalExpenses)}
        icon={TrendingDown}
      />
      <StatCard
        title="Remaining"
        value={formatCurrency(remaining)}
        icon={TrendingUp}
      />
      <StatCard
        title="Utilization"
        value={`${utilization}%`}
        icon={Activity}
      />
    </div>
  );
}
