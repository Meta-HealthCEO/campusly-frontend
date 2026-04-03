'use client';

import { StatCard } from '@/components/shared/StatCard';
import { Package, DollarSign, Wrench, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { AssetSummaryReport } from '@/types';

interface AssetSummaryCardsProps {
  summary: AssetSummaryReport | null;
}

export function AssetSummaryCards({ summary }: AssetSummaryCardsProps) {
  const totalAssets = summary?.totalAssets ?? 0;
  const totalValue = summary?.totalValue ?? 0;
  const underRepair = summary?.byStatus?.under_repair ?? 0;
  const overdueCheckouts = summary?.overdueCheckouts ?? 0;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Assets"
        value={totalAssets.toString()}
        icon={Package}
      />
      <StatCard
        title="Total Value"
        value={formatCurrency(totalValue)}
        icon={DollarSign}
      />
      <StatCard
        title="Under Repair"
        value={underRepair.toString()}
        icon={Wrench}
      />
      <StatCard
        title="Overdue Check-Outs"
        value={overdueCheckouts.toString()}
        icon={AlertTriangle}
      />
    </div>
  );
}
