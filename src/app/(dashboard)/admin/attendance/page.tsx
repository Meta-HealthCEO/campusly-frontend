'use client';

import { useState, useEffect, useMemo } from 'react';
import { UserCheck, AlertTriangle, Calendar } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { DailyAttendanceSummaryChart } from '@/components/attendance/DailyAttendanceSummaryChart';
import { AbsenteeList } from '@/components/attendance/AbsenteeList';
import { ChronicAbsenteeTable } from '@/components/attendance/ChronicAbsenteeTable';
import { useAdminAttendance } from '@/hooks/useAttendance';
import { useAttendanceAnalytics } from '@/hooks/useAttendanceAnalytics';

export default function AdminAttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { dailyReport, absentees, loading } = useAdminAttendance(selectedDate);
  const {
    chronicAbsentees, loadingAbsentees, loadChronicAbsentees,
  } = useAttendanceAnalytics();

  const [threshold, setThreshold] = useState(80);

  useEffect(() => {
    loadChronicAbsentees(threshold);
  }, [threshold, loadChronicAbsentees]);

  const totalPresent = useMemo(
    () => dailyReport.reduce((sum, c) => sum + c.present, 0), [dailyReport],
  );
  const totalAbsent = useMemo(
    () => dailyReport.reduce((sum, c) => sum + c.absent, 0), [dailyReport],
  );
  const totalLate = useMemo(
    () => dailyReport.reduce((sum, c) => sum + c.late, 0), [dailyReport],
  );
  const totalStudents = useMemo(
    () => dailyReport.reduce((sum, c) => sum + c.total, 0), [dailyReport],
  );
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
            className="w-full sm:w-40"
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

      {chronicAbsentees.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Chronic Absentees Detected</AlertTitle>
          <AlertDescription>
            {chronicAbsentees.length} {chronicAbsentees.length === 1 ? 'student is' : 'students are'} below {threshold}% attendance this term.
          </AlertDescription>
        </Alert>
      )}

      <ChronicAbsenteeTable
        absentees={chronicAbsentees}
        loading={loadingAbsentees}
        threshold={threshold}
        onThresholdChange={setThreshold}
      />
    </div>
  );
}
