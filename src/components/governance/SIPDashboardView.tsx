'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { RAGBadge } from './RAGBadge';
import { Target, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { SIPDashboard } from '@/types';

const WSE_LABELS: Record<number, string> = {
  1: 'Basic Functionality',
  2: 'Leadership & Management',
  3: 'Governance & Relationships',
  4: 'Teaching & Learning',
  5: 'Curriculum & Resources',
  6: 'Learner Achievement',
  7: 'Safety & Discipline',
  8: 'Infrastructure',
  9: 'Parents & Community',
};

interface SIPDashboardViewProps {
  dashboard: SIPDashboard | null;
}

export function SIPDashboardView({ dashboard }: SIPDashboardViewProps) {
  if (!dashboard) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        No dashboard data available. Select an active SIP plan to view progress.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold truncate">{dashboard.planTitle}</h2>
          <p className="text-sm text-muted-foreground">Year {dashboard.year}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Overall:</span>
          <RAGBadge rag={dashboard.overallRAG} />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Goals"
          value={String(dashboard.totalGoals)}
          icon={Target}
          description={`${dashboard.overallCompletion}% avg completion`}
        />
        <StatCard
          title="Completed"
          value={String(dashboard.completed)}
          icon={CheckCircle2}
        />
        <StatCard
          title="In Progress"
          value={String(dashboard.inProgress)}
          icon={Clock}
        />
        <StatCard
          title="Overdue"
          value={String(dashboard.overdue)}
          icon={AlertTriangle}
        />
      </div>

      <div>
        <h3 className="text-base font-medium mb-3">Progress by WSE Area</h3>
        {dashboard.byWSEArea.length === 0 ? (
          <p className="text-sm text-muted-foreground">No WSE area data available.</p>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {dashboard.byWSEArea.map((area) => (
              <Card key={area.wseArea}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-medium leading-snug">
                      WSE {area.wseArea}: {WSE_LABELS[area.wseArea] ?? area.wseLabel}
                    </CardTitle>
                    <RAGBadge rag={area.rag} size="sm" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-1">
                  <p className="text-xs text-muted-foreground">{area.goalCount} goal{area.goalCount !== 1 ? 's' : ''}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>{area.completed} completed</span>
                    <span>{area.inProgress} in progress</span>
                    {area.overdue > 0 && (
                      <span className="text-destructive">{area.overdue} overdue</span>
                    )}
                  </div>
                  <p className="text-xs font-medium">{area.avgCompletion}% avg</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
