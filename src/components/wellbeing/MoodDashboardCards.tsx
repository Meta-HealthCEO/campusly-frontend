'use client';

import { StatCard } from '@/components/shared/StatCard';
import { Smile, Shield, TrendingUp, TrendingDown } from 'lucide-react';
import type { MoodDashboardData } from '@/types';

interface MoodDashboardCardsProps {
  data: MoodDashboardData;
}

export function MoodDashboardCards({ data }: MoodDashboardCardsProps) {
  const moodTrend = data.changePercent >= 0 ? 'up' : 'down';
  const MoodIcon = moodTrend === 'up' ? TrendingUp : TrendingDown;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Average Mood"
        value={data.currentAverageMood.toFixed(1)}
        icon={Smile}
        description={`${data.changePercent >= 0 ? '+' : ''}${data.changePercent}% vs previous`}
      />
      <StatCard
        title="Safety Score"
        value={`${data.safetyScore}%`}
        icon={Shield}
        description="Students feeling safe"
      />
      <StatCard
        title="Responses"
        value={data.trendData.reduce((sum, t) => sum + t.responseCount, 0).toString()}
        icon={MoodIcon}
        description="Total survey responses"
      />
      <StatCard
        title="Grades Tracked"
        value={data.gradeBreakdown.length.toString()}
        icon={TrendingUp}
        description="Grade levels with data"
      />
    </div>
  );
}
