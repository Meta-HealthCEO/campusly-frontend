'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Building2, Users, Activity,
} from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';

interface PlatformAnalytics {
  mrr: number;
  arr: number;
  growthRate: number;
  churnCount: number;
  activeSchools: number;
  totalSchools: number;
  activeUsers: number;
}

interface PlatformAnalyticsPanelProps {
  fetchAnalytics: () => Promise<PlatformAnalytics | null>;
}

export function PlatformAnalyticsPanel({ fetchAnalytics }: PlatformAnalyticsPanelProps) {
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchAnalytics();
    setData(result);
    setLoading(false);
  }, [fetchAnalytics]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  if (!data) {
    return <p className="text-sm text-muted-foreground">Failed to load analytics.</p>;
  }

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard
        title="MRR"
        value={formatCurrency(data.mrr)}
        icon={DollarSign}
        description="Monthly recurring revenue"
      />
      <StatCard
        title="ARR"
        value={formatCurrency(data.arr)}
        icon={DollarSign}
        description="Annual recurring revenue"
      />
      <StatCard
        title="Growth"
        value={`${data.growthRate >= 0 ? '+' : ''}${data.growthRate}%`}
        icon={data.growthRate >= 0 ? TrendingUp : TrendingDown}
        description="Month-over-month"
      />
      <StatCard
        title="Churn"
        value={String(data.churnCount)}
        icon={TrendingDown}
        description="Last 30 days"
      />
      <StatCard
        title="Active Schools"
        value={`${data.activeSchools}/${data.totalSchools}`}
        icon={Building2}
        description="Active / total"
      />
      <StatCard
        title="Active Users"
        value={String(data.activeUsers)}
        icon={Users}
        description="Last 7 days"
      />
    </div>
  );
}
