'use client';

import { Award, BookOpen, CalendarCheck, TrendingUp, type LucideIcon } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { learnerQuickStats, type LearnerStatKey } from '@/lib/learner-profile';
import type { LearnerProfileData } from '@/types/student-360';

const ICONS: Record<LearnerStatKey, LucideIcon> = {
  average: TrendingUp,
  attendance: CalendarCheck,
  homework: BookOpen,
  merits: Award,
};

export function LearnerQuickStats({ profile }: { profile: LearnerProfileData }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {learnerQuickStats(profile).map((stat) => (
        <StatCard key={stat.key} title={stat.title} value={stat.value} description={stat.description} icon={ICONS[stat.key]} />
      ))}
    </div>
  );
}
