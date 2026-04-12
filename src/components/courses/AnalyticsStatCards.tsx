'use client';

import { Users, CheckCircle2, Target, Award } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import type { CourseAnalytics } from '@/types';

interface AnalyticsStatCardsProps {
  data: CourseAnalytics;
}

export function AnalyticsStatCards({ data }: AnalyticsStatCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Enrolments"
        value={data.enrolmentCount.toString()}
        icon={Users}
        description={`${data.activeCount} active · ${data.completedCount} completed`}
      />
      <StatCard
        title="Completion Rate"
        value={`${Math.round(data.completionRate)}%`}
        icon={CheckCircle2}
        description={`${data.completedCount} / ${data.enrolmentCount} students`}
      />
      <StatCard
        title="Avg Quiz Score"
        value={`${Math.round(data.avgQuizScore)}%`}
        icon={Target}
        description="Across all graded quizzes"
      />
      <StatCard
        title="Certificates Issued"
        value={data.certificatesIssued.toString()}
        icon={Award}
        description="Students who earned a cert"
      />
    </div>
  );
}
