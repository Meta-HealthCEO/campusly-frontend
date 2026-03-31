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
import apiClient from '@/lib/api-client';
import type { DashboardStats } from '@/types';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({ totalStudents: 0, totalStaff: 0, revenueCollected: 0, collectionRate: 0, attendanceRate: 0, outstandingFees: 0, walletBalance: 0 });
  const [revenueData, setRevenueData] = useState<Record<string, unknown>[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, unknown>[]>([]);
  const [feeStatusData, setFeeStatusData] = useState<{ name: string; value: number; color?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await apiClient.get('/reports/dashboard');
        if (response.data) {
          const d = response.data.data ?? response.data;
          // The API returns flat stats or nested under d.stats
          const raw = d.stats ?? d;
          setStats((prev) => ({
            ...prev,
            totalStudents: raw.totalStudents ?? prev.totalStudents,
            revenueCollected: raw.totalRevenueThisMonth ?? raw.revenueCollected ?? prev.revenueCollected,
            collectionRate: raw.feeCollectionRate ?? raw.collectionRate ?? prev.collectionRate,
            attendanceRate: raw.attendanceRate ?? prev.attendanceRate,
            outstandingFees: raw.outstandingFees ?? prev.outstandingFees,
          }));
          if (d.revenueData) setRevenueData(d.revenueData);
          if (d.attendanceByGrade) setAttendanceData(d.attendanceByGrade);
          if (d.feeStatus) setFeeStatusData(d.feeStatus);
        }
      } catch {
        console.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
