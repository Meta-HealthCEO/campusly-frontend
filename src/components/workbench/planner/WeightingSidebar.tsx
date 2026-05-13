'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AssessmentPlanType, WeightingInfo } from '@/types';

interface Props {
  weightings: WeightingInfo[];
}

const TYPE_LABELS: Record<AssessmentPlanType, string> = {
  test: 'Tests',
  exam: 'Exams',
  assignment: 'Assignments',
  practical: 'Practicals',
  project: 'Projects',
};

const TYPE_ORDER: AssessmentPlanType[] = ['test', 'exam', 'assignment', 'practical', 'project'];

function progressBarWidth(actual: number, required: number): number {
  if (required <= 0) return Math.min(actual, 100);
  return Math.min((actual / required) * 100, 100);
}

function totalTone(total: number, required: number): string {
  const target = required || 100;
  if (Math.round(total) === Math.round(target)) return 'border-emerald-500 text-emerald-700';
  if (total > target) return 'border-destructive text-destructive';
  return 'border-amber-500 text-amber-700';
}

export function WeightingSidebar({ weightings }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Assessment Weightings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {weightings.length === 0 && (
          <p className="text-xs text-muted-foreground">No weighting data available.</p>
        )}

        {weightings.map((weighting) => {
          const requiredTotal = weighting.totalRequiredWeight || 100;
          const totalPct = progressBarWidth(weighting.totalWeight, requiredTotal);

          return (
            <div key={weighting.subjectId} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium truncate">{weighting.subjectName}</span>
                <Badge variant="outline" className={cn('text-xs shrink-0', totalTone(weighting.totalWeight, requiredTotal))}>
                  {Math.round(weighting.totalWeight)}% / {requiredTotal}%
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total planned</span>
                  <span>{weighting.assessmentCount ?? 0} items</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      weighting.totalWeight > requiredTotal
                        ? 'bg-destructive'
                        : totalPct >= 100
                          ? 'bg-emerald-500'
                          : 'bg-primary',
                    )}
                    style={{ width: `${totalPct}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {TYPE_ORDER.map((type) => {
                  const actual = Number(weighting.byType?.[type] ?? 0);
                  const required = Number(weighting.requiredByType?.[type] ?? 0);
                  if (actual === 0 && required === 0) return null;

                  return (
                    <div key={type} className="rounded-md border p-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{TYPE_LABELS[type]}</span>
                        <span className="text-muted-foreground">
                          {actual}%{required > 0 ? ` / ${required}%` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
