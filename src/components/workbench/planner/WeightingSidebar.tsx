'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WeightingInfo } from '@/types';

interface Props {
  weightings: WeightingInfo[];
}

function progressBarWidth(actual: number, required: number): number {
  if (required === 0) return 0;
  return Math.min((actual / required) * 100, 100);
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
        {weightings.map((w) => {
          const formalPct = progressBarWidth(w.actualFormalWeight, w.requiredFormalWeight);
          const isUnbalanced = Math.round(w.totalWeight) !== 100;

          return (
            <div key={w.subjectId} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium truncate">{w.subjectName}</span>
                {isUnbalanced && (
                  <Badge variant="destructive" className="text-xs shrink-0">
                    {Math.round(w.totalWeight)}%
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Formal</span>
                  <span>
                    {w.actualFormalWeight}% / {w.requiredFormalWeight}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      formalPct >= 100 ? 'bg-emerald-500' : 'bg-primary',
                    )}
                    style={{ width: `${formalPct}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Informal</span>
                  <span>
                    {w.actualInformalWeight}% / {w.requiredInformalWeight}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      progressBarWidth(w.actualInformalWeight, w.requiredInformalWeight) >= 100
                        ? 'bg-emerald-500'
                        : 'bg-primary',
                    )}
                    style={{
                      width: `${progressBarWidth(w.actualInformalWeight, w.requiredInformalWeight)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
