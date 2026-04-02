'use client';

import { useEffect } from 'react';
import { Building2, Users, TrendingUp, Activity } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChartComponent } from '@/components/charts';
import { RevenueChart } from '@/components/superadmin/RevenueChart';
import { PlatformAnalyticsPanel } from '@/components/superadmin/PlatformAnalyticsPanel';
import { HealthOverviewTable } from '@/components/superadmin/HealthOverviewTable';
import { useSuperAdminStore } from '@/stores/useSuperAdminStore';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { formatCurrency } from '@/lib/utils';

export default function SuperAdminDashboardPage() {
  const { stats, statsLoading, revenue, revenueLoading, tenants } =
    useSuperAdminStore();
  const { fetchStats, fetchRevenue, fetchTenants, fetchPlatformAnalytics, fetchHealthOverview } = useSuperAdmin();

  useEffect(() => {
    fetchStats();
    fetchRevenue();
    fetchTenants({ limit: 100 });
  }, [fetchStats, fetchRevenue, fetchTenants]);

  const tierCounts = tenants.reduce<Record<string, number>>((acc, t) => {
    const tier = t.tier || 'starter';
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {});

  const tierChartData = [
    { name: 'Enterprise', value: tierCounts['enterprise'] || 0, color: '#7C3AED' },
    { name: 'Growth', value: tierCounts['growth'] || 0, color: '#10B981' },
    { name: 'Starter', value: tierCounts['starter'] || 0, color: '#F59E0B' },
  ].filter((d) => d.value > 0);

  if (statsLoading && !stats) {
    return (
      <div className="space-y-6">
        <PageHeader title="Platform Overview" description="Campusly platform metrics at a glance" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const displayStats = stats ?? {
    totalSchools: 0,
    totalStudents: 0,
    mrr: 0,
    arr: 0,
    activeTrials: 0,
    outstanding: 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Overview" description="Campusly platform metrics at a glance" />

      <PlatformAnalyticsPanel fetchAnalytics={fetchPlatformAnalytics} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Schools"
          value={displayStats.totalSchools.toString()}
          icon={Building2}
          description={`${displayStats.activeTrials} on active trial`}
        />
        <StatCard
          title="Total Tenants"
          value={tenants.length.toString()}
          icon={Users}
          description="Across all statuses"
        />
        <StatCard
          title="Total Paid Revenue"
          value={formatCurrency(displayStats.mrr)}
          icon={TrendingUp}
          description="All time paid invoices"
        />
        <StatCard
          title="Active Trials"
          value={displayStats.activeTrials.toString()}
          icon={Activity}
          description={`${displayStats.outstanding} overdue invoices`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RevenueChart
          monthly={revenue?.monthly ?? []}
          loading={revenueLoading}
        />
        <Card>
          <CardHeader>
            <CardTitle>Schools by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            {tierChartData.length > 0 ? (
              <PieChartComponent data={tierChartData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No tier data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <HealthOverviewTable fetchHealthOverview={fetchHealthOverview} />
    </div>
  );
}
