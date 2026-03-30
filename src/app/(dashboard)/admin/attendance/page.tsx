'use client';

import { UserCheck, AlertTriangle } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChartComponent } from '@/components/charts';
import { EmptyState } from '@/components/shared/EmptyState';
import { mockAdminStats, mockAttendanceByGrade, mockAttendance } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';

const absences = mockAttendance.filter((att) => att.status === 'absent' || att.status === 'late');

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Attendance Overview" description="Monitor school-wide attendance rates and absences" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Overall Attendance Rate"
          value={`${mockAdminStats.attendanceRate}%`}
          icon={UserCheck}
          description="Average across all grades"
          trend={{ value: 1, label: 'vs last week' }}
        />
        <StatCard
          title="Total Absences"
          value={absences.filter((a) => a.status === 'absent').length.toString()}
          icon={AlertTriangle}
          description="This month"
        />
        <StatCard
          title="Late Arrivals"
          value={absences.filter((a) => a.status === 'late').length.toString()}
          icon={AlertTriangle}
          description="This month"
        />
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

      <Card>
        <CardHeader>
          <CardTitle>Recent Absences & Late Arrivals</CardTitle>
        </CardHeader>
        <CardContent>
          {absences.length === 0 ? (
            <EmptyState icon={UserCheck} title="No absences" description="All students have been present recently." />
          ) : (
            <div className="space-y-2">
              {absences.map((att) => {
                const statusStyles: Record<string, string> = {
                  absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                  late: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                };
                return (
                  <div key={att.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">
                        {att.student.user.firstName} {att.student.user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {att.student.grade.name} - Class {att.student.class.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{formatDate(att.date)}</span>
                      <Badge className={statusStyles[att.status] || ''}>
                        {att.status.charAt(0).toUpperCase() + att.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
