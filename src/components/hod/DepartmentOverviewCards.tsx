'use client';

import { useMemo } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { BookOpen, Users, TrendingUp, ClipboardCheck } from 'lucide-react';
import type { DepartmentPerformance, ModerationQueue, WorkloadEntry } from '@/types';

interface DepartmentOverviewCardsProps {
  performance: DepartmentPerformance | null;
  moderation: ModerationQueue | null;
  workload: WorkloadEntry[];
}

export function DepartmentOverviewCards({
  performance,
  moderation,
  workload,
}: DepartmentOverviewCardsProps) {
  const stats = useMemo(() => {
    const subjectCount = performance?.subjects?.length ?? 0;
    const teacherCount = workload.length;
    const avgPerf = performance?.subjects && performance.subjects.length > 0
      ? Math.round(
          performance.subjects.reduce((s, sub) => s + sub.overallAverage, 0)
          / performance.subjects.length * 10,
        ) / 10
      : 0;
    const pendingModeration = moderation?.items?.filter(
      (i) => i.status === 'pending',
    ).length ?? 0;

    return { subjectCount, teacherCount, avgPerf, pendingModeration };
  }, [performance, moderation, workload]);

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Subjects"
        value={String(stats.subjectCount)}
        icon={BookOpen}
        description="in department"
      />
      <StatCard
        title="Teachers"
        value={String(stats.teacherCount)}
        icon={Users}
        description="assigned"
      />
      <StatCard
        title="Avg Performance"
        value={`${stats.avgPerf}%`}
        icon={TrendingUp}
        description="across subjects"
      />
      <StatCard
        title="Pending Moderation"
        value={String(stats.pendingModeration)}
        icon={ClipboardCheck}
        description="papers to review"
      />
    </div>
  );
}
