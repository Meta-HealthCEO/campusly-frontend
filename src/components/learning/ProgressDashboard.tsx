'use client';

import { TrendingUp, TrendingDown, Minus, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/shared/EmptyState';
import type { StudentProgress } from './types';
import { getPopulatedName } from './types';

interface ProgressDashboardProps {
  progress: StudentProgress[];
}

const trendConfig = {
  improving: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100 text-emerald-800', label: 'Improving' },
  stable: { icon: Minus, color: 'text-amber-600', bg: 'bg-amber-100 text-amber-800', label: 'Stable' },
  declining: { icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10 text-destructive', label: 'Declining' },
};

export function ProgressDashboard({ progress }: ProgressDashboardProps) {
  if (progress.length === 0) {
    return <EmptyState icon={BookOpen} title="No Progress Data" description="No progress records have been recorded yet." />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {progress.map((p) => {
        const trend = trendConfig[p.trend] ?? trendConfig.stable;
        const TrendIcon = trend.icon;
        const subjectName = getPopulatedName(p.subjectId) || 'Unknown Subject';

        return (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{subjectName}</CardTitle>
                <Badge variant="secondary" className={trend.bg}>
                  <TrendIcon className="mr-1 h-3 w-3" />
                  {trend.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mastery</span>
                  <span className="font-bold text-lg">{p.masteryPercentage}%</span>
                </div>
                <Progress value={p.masteryPercentage} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Assignments</p>
                  <p className="font-medium">{p.assignmentsCompleted}/{p.assignmentsTotal}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Mark</p>
                  <p className="font-medium">{Math.round(p.averageMark)}%</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Term {p.term}, {p.year}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
