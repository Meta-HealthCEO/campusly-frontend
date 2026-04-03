'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Loader2, XCircle, Target } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import type { SchoolImprovementPlan, MilestoneStatus, SipGoalCategory } from '@/types';

interface SipProgressBoardProps {
  sip: SchoolImprovementPlan;
}

const STATUS_ICON: Record<MilestoneStatus, React.ReactNode> = {
  not_started: <Circle className="h-4 w-4 text-muted-foreground" />,
  in_progress: <Loader2 className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  blocked: <XCircle className="h-4 w-4 text-destructive" />,
};

const CATEGORY_COLORS: Record<SipGoalCategory, string> = {
  academic: 'bg-blue-100 text-blue-800',
  infrastructure: 'bg-amber-100 text-amber-800',
  governance: 'bg-purple-100 text-purple-800',
  financial: 'bg-emerald-100 text-emerald-800',
  community: 'bg-rose-100 text-rose-800',
};

export function SipProgressBoard({ sip }: SipProgressBoardProps) {
  if (sip.goals.length === 0) {
    return <EmptyState icon={Target} title="No goals" description="No improvement goals have been set for this year." />;
  }

  return (
    <div className="space-y-6">
      {/* Overall progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Overall Progress</h3>
              <p className="text-sm text-muted-foreground">
                {sip.year} School Improvement Plan
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32 sm:w-48 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${sip.overallProgress}%` }}
                />
              </div>
              <span className="text-sm font-medium">{sip.overallProgress}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {sip.goals.map((goal, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm truncate">{goal.title}</CardTitle>
                  <Badge className={`mt-1 ${CATEGORY_COLORS[goal.category]}`} variant="outline">
                    {goal.category}
                  </Badge>
                </div>
                <span className="text-sm font-medium text-muted-foreground shrink-0">
                  {goal.progress}%
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {goal.milestones.map((ms, mIdx) => (
                  <li key={mIdx} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 shrink-0">{STATUS_ICON[ms.status]}</span>
                    <div className="min-w-0">
                      <span className="truncate block">{ms.title}</span>
                      <span className="text-xs text-muted-foreground">
                        Target: {ms.targetDate}
                        {ms.completedDate && ` | Done: ${ms.completedDate}`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
