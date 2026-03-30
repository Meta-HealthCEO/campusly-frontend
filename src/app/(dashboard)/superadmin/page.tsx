'use client';

import { Building2, Users, TrendingUp, Activity } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChartComponent, PieChartComponent, AreaChartComponent } from '@/components/charts';
import {
  mockPlatformStats,
  mockPlatformRevenueTrend,
  mockSchoolsByTier,
  mockStudentGrowth,
} from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';

export default function SuperAdminDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Platform Overview" description="Campusly platform metrics at a glance" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Schools"
          value={mockPlatformStats.totalSchools.toString()}
          icon={Building2}
          description={`${mockPlatformStats.activeTrials} on active trial`}
          trend={{ value: 25, label: 'vs last quarter' }}
        />
        <StatCard
          title="Total Students"
          value={mockPlatformStats.totalStudents.toLocaleString()}
          icon={Users}
          description="Across all tenants"
          trend={{ value: 8, label: 'vs last month' }}
        />
        <StatCard
          title="MRR"
          value={formatCurrency(mockPlatformStats.mrr)}
          icon={TrendingUp}
          description={`ARR: ${formatCurrency(mockPlatformStats.arr)}`}
          trend={{ value: 10, label: 'vs last month' }}
        />
        <StatCard
          title="Active Trials"
          value={mockPlatformStats.activeTrials.toString()}
          icon={Activity}
          description={`${formatCurrency(mockPlatformStats.outstanding)} outstanding`}
          trend={{ value: 0, label: 'this week' }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>MRR Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={mockPlatformRevenueTrend as Record<string, unknown>[]}
              xKey="month"
              lines={[{ key: 'mrr', color: '#2563EB', name: 'MRR (R)' }]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schools by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent data={mockSchoolsByTier} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <AreaChartComponent
            data={mockStudentGrowth as Record<string, unknown>[]}
            xKey="month"
            areas={[{ key: 'students', color: '#2563EB', name: 'Total Students' }]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
