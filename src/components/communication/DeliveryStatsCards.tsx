'use client';

import { Send, CheckCircle, XCircle, Eye, DollarSign } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import type { DeliveryStats } from '@/types';

interface DeliveryStatsCardsProps {
  stats: DeliveryStats;
}

function formatCost(val: number): string {
  return `R${val.toFixed(2)}`;
}

export function DeliveryStatsCards({ stats }: DeliveryStatsCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        title="Total Sent"
        value={stats.totalSent.toLocaleString()}
        icon={Send}
      />
      <StatCard
        title="Delivery Rate"
        value={`${stats.deliveryRate.toFixed(1)}%`}
        icon={CheckCircle}
        description={`${stats.delivered.toLocaleString()} delivered`}
      />
      <StatCard
        title="Open Rate"
        value={`${stats.openRate.toFixed(1)}%`}
        icon={Eye}
        description={`${stats.opened.toLocaleString()} opened`}
      />
      <StatCard
        title="Failed"
        value={stats.failed.toLocaleString()}
        icon={XCircle}
        description={`${stats.bounced} bounced`}
      />
      <StatCard
        title="Total Cost"
        value={formatCost(stats.totalCost)}
        icon={DollarSign}
      />
    </div>
  );
}
