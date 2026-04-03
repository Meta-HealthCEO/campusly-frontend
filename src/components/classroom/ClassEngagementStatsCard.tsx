'use client';

import type { ClassEngagementStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Users, PlayCircle } from 'lucide-react';

interface ClassEngagementStatsCardProps {
  stats: ClassEngagementStats | null;
}

function Stat({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40">
      <div className="rounded-full bg-primary/10 p-2">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground text-center">{label}</p>
    </div>
  );
}

export function ClassEngagementStatsCard({ stats }: ClassEngagementStatsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Class Engagement</CardTitle>
      </CardHeader>
      <CardContent>
        {!stats ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No engagement data available.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat
              icon={CalendarDays}
              label="Sessions Held"
              value={String(stats.sessionsHeld)}
            />
            <Stat
              icon={Users}
              label="Avg Participation"
              value={`${Math.round(stats.avgParticipationRate)}%`}
            />
            <Stat
              icon={PlayCircle}
              label="Video Watch Rate"
              value={`${Math.round(stats.videoWatchRate)}%`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
