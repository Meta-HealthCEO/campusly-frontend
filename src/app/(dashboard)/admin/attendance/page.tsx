'use client';

import { useState } from 'react';
import { UserCheck, AlertTriangle, Calendar } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { DailyAttendanceSummaryChart } from '@/components/attendance/DailyAttendanceSummaryChart';
import { AbsenteeList } from '@/components/attendance/AbsenteeList';
import { useAdminAttendance } from '@/hooks/useAttendance';

export default function AdminAttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { dailyReport, absentees, loading } = useAdminAttendance(selectedDate);

  const totalPresent = dailyReport.reduce((sum, c) => sum + c.present, 0);
  const totalAbsent = dailyReport.reduce((sum, c) => sum + c.absent, 0);
  const totalLate = dailyReport.reduce((sum, c) => sum + c.late, 0);
  const totalStudents = dailyReport.reduce((sum, c) => sum + c.total, 0);
  const overallRate = totalStudents > 0
    ? Math.round(((totalPresent + totalLate) / totalStudents) * 100)
    : 0;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance Overview" description="Monitor school-wide attendance rates and absences">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Overall Attendance Rate"
          value={`${overallRate}%`}
          icon={UserCheck}
          description="Average across all classes"
        />
        <StatCard
          title="Total Absences"
          value={totalAbsent.toString()}
          icon={AlertTriangle}
          description={`On ${selectedDate}`}
        />
        <StatCard
          title="Late Arrivals"
          value={totalLate.toString()}
          icon={AlertTriangle}
          description={`On ${selectedDate}`}
        />
      </div>

      <DailyAttendanceSummaryChart data={dailyReport} />

      <AbsenteeList absentees={absentees} />
    </div>
  );
}
