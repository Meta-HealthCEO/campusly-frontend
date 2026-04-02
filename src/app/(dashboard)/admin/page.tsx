'use client';

import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, UserCheck } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChartComponent, BarChartComponent, PieChartComponent } from '@/components/charts';
import { AnnouncementBanner } from '@/components/announcements/AnnouncementBanner';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';
import { useReports } from '@/hooks/useReports';
import type { DashboardStats } from '@/types';

export default function AdminDashboardPage() {
  const { fetchDashboard, loading } = useReports();
  const [stats, setStats] = useState<DashboardStats>({ totalStudents: 0, totalStaff: 0, revenueCollected: 0, collectionRate: 0, attendanceRate: 0, outstandingFees: 0, walletBalance: 0 });
  const [revenueData, setRevenueData] = useState<Record<string, unknown>[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, unknown>[]>([]);
  const [feeStatusData, setFeeStatusData] = useState<{ name: string; value: number; color?: string }[]>([]);

  useEffect(() => {
    async function fetchData() {
      const data = await fetchDashboard();
      if (data) {
        setStats((prev) => ({
          ...prev,
          totalStudents: data.stats.totalStudents ?? prev.totalStudents,
          revenueCollected: data.stats.revenueCollected ?? prev.revenueCollected,
          collectionRate: data.stats.collectionRate ?? prev.collectionRate,
          attendanceRate: data.stats.attendanceRate ?? prev.attendanceRate,
          outstandingFees: data.stats.outstandingFees ?? prev.outstandingFees,
        }));
        setRevenueData(data.revenueData);
        setAttendanceData(data.attendanceData);
        setFeeStatusData(data.feeStatusData);
      }
    }
    fetchData();
  }, [fetchDashboard]);

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" description="Overview of your school at a glance" />

      {loading && <LoadingSpinner />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats.totalStudents.toString()}
          icon={Users}
          description={`${stats.totalStaff} staff members`}
          trend={{ value: 5, label: 'vs last term' }}
        />
        <StatCard
          title="Revenue Collected"
          value={formatCurrency(stats.revenueCollected)}
          icon={DollarSign}
          description={`${formatCurrency(stats.outstandingFees)} outstanding`}
          trend={{ value: 12, label: 'vs last month' }}
        />
        <StatCard
          title="Collection Rate"
          value={`${stats.collectionRate}%`}
          icon={TrendingUp}
          description="Of total invoiced fees"
          trend={{ value: 3, label: 'vs last term' }}
        />
        <StatCard
          title="Attendance Rate"
          value={`${stats.attendanceRate}%`}
          icon={UserCheck}
          description="Average across all grades"
          trend={{ value: 1, label: 'vs last week' }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={revenueData}
              xKey="month"
              lines={[
                { key: 'collected', color: '#2563EB', name: 'Collected' },
                { key: 'outstanding', color: '#EF4444', name: 'Outstanding' },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee Status</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent data={feeStatusData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance by Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={attendanceData}
              xKey="grade"
              bars={[{ key: 'rate', color: '#2563EB', name: 'Attendance Rate (%)' }]}
            />
          </CardContent>
        </Card>
        <AnnouncementBanner limit={5} />
      </div>
    </div>
  );
}
