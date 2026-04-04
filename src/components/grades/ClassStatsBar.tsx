'use client';

import { BarChart3, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import type { ClassStats } from '@/hooks/useTeacherGrades';

interface ClassStatsBarProps {
  stats: ClassStats;
  totalMarks: number;
}

export function ClassStatsBar({ stats, totalMarks }: ClassStatsBarProps) {
  const passRate = stats.totalWithMarks > 0
    ? Math.round((stats.passCount / stats.totalWithMarks) * 100)
    : 0;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Class Average"
        value={`${stats.average}%`}
        icon={BarChart3}
        description={`${stats.totalWithMarks} students marked`}
      />
      <StatCard
        title="Highest Mark"
        value={`${stats.highest}/${totalMarks}`}
        icon={TrendingUp}
        description={`${Math.round((stats.highest / totalMarks) * 100)}%`}
      />
      <StatCard
        title="Lowest Mark"
        value={`${stats.lowest}/${totalMarks}`}
        icon={TrendingDown}
        description={`${Math.round((stats.lowest / totalMarks) * 100)}%`}
      />
      <StatCard
        title="Pass Rate"
        value={`${passRate}%`}
        icon={Users}
        description={`${stats.passCount}/${stats.totalWithMarks} passed (>= 50%)`}
      />
    </div>
  );
}
