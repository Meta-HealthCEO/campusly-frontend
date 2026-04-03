'use client';

import { Users, UserCheck, GraduationCap, DollarSign, BookOpen, Briefcase } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import type { PrincipalKPIs, KpiMetric } from '@/types';

interface KpiCardsProps {
  kpis: PrincipalKPIs;
}

function formatMetric(metric: KpiMetric, suffix = ''): { value: string; trend: { value: number; label: string } } {
  return {
    value: `${metric.current}${suffix}`,
    trend: {
      value: metric.changePercent,
      label: 'vs prev term',
    },
  };
}

export function KpiCards({ kpis }: KpiCardsProps) {
  const enrollment = formatMetric(kpis.enrollment);
  const attendance = formatMetric(kpis.attendanceRate, '%');
  const passRate = formatMetric(kpis.passRate, '%');
  const feeCollection = formatMetric(kpis.feeCollectionRate, '%');
  const teacherAttendance = formatMetric(kpis.teacherAttendanceRate, '%');
  const homeworkCompletion = formatMetric(kpis.homeworkCompletionRate, '%');

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        title="Enrollment"
        value={enrollment.value}
        icon={Users}
        description={`Was ${kpis.enrollment.previousTerm}`}
        trend={enrollment.trend}
      />
      <StatCard
        title="Attendance Rate"
        value={attendance.value}
        icon={UserCheck}
        description={`Was ${kpis.attendanceRate.previousTerm}%`}
        trend={attendance.trend}
      />
      <StatCard
        title="Pass Rate"
        value={passRate.value}
        icon={GraduationCap}
        description={`Was ${kpis.passRate.previousTerm}%`}
        trend={passRate.trend}
      />
      <StatCard
        title="Fee Collection"
        value={feeCollection.value}
        icon={DollarSign}
        description={`Was ${kpis.feeCollectionRate.previousTerm}%`}
        trend={feeCollection.trend}
      />
      <StatCard
        title="Teacher Attendance"
        value={teacherAttendance.value}
        icon={Briefcase}
        description={`Was ${kpis.teacherAttendanceRate.previousTerm}%`}
        trend={teacherAttendance.trend}
      />
      <StatCard
        title="Homework Completion"
        value={homeworkCompletion.value}
        icon={BookOpen}
        description={`Was ${kpis.homeworkCompletionRate.previousTerm}%`}
        trend={homeworkCompletion.trend}
      />
    </div>
  );
}
