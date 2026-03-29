'use client';

import { Users, DollarSign, TrendingUp, UserCheck } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChartComponent, BarChartComponent, PieChartComponent } from '@/components/charts';
import { mockAdminStats, mockRevenueData, mockAttendanceByGrade, mockFeeStatusData } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your school at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={mockAdminStats.totalStudents.toString()}
          icon={Users}
          description={`${mockAdminStats.totalStaff} staff members`}
          trend={{ value: 5, label: 'vs last term' }}
        />
        <StatCard
          title="Revenue Collected"
          value={formatCurrency(mockAdminStats.revenueCollected)}
          icon={DollarSign}
          description={`${formatCurrency(mockAdminStats.outstandingFees)} outstanding`}
          trend={{ value: 12, label: 'vs last month' }}
        />
        <StatCard
          title="Collection Rate"
          value={`${mockAdminStats.collectionRate}%`}
          icon={TrendingUp}
          description="Of total invoiced fees"
          trend={{ value: 3, label: 'vs last term' }}
        />
        <StatCard
          title="Attendance Rate"
          value={`${mockAdminStats.attendanceRate}%`}
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
              data={mockRevenueData as Record<string, unknown>[]}
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
            <PieChartComponent data={mockFeeStatusData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance by Grade</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChartComponent
            data={mockAttendanceByGrade as Record<string, unknown>[]}
            xKey="grade"
            bars={[{ key: 'rate', color: '#2563EB', name: 'Attendance Rate (%)' }]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
