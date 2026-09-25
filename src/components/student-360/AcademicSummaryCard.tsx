'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { FullStudent360Academic } from '@/types/student-360';

interface AcademicSummaryCardProps {
  academic: FullStudent360Academic;
}

function getGradeSymbol(percentage: number): string {
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  if (percentage >= 40) return 'E';
  return 'F';
}

/** A mastery dot and a foreground label (ruling O1 revised 2); every threshold branch kept (ruling R21). */
const GRADE_DOT = "gap-1.5 bg-transparent text-foreground before:size-2 before:shrink-0 before:rounded-full before:content-['']";

function getGradeColor(percentage: number): string {
  if (percentage >= 80) return `${GRADE_DOT} before:bg-mark-secure`;
  if (percentage >= 70) return `${GRADE_DOT} before:bg-mark-secure`;
  if (percentage >= 60) return `${GRADE_DOT} before:bg-mark-building`;
  if (percentage >= 50) return `${GRADE_DOT} before:bg-mark-weak`;
  if (percentage >= 40) return `${GRADE_DOT} before:bg-mark-weak`;
  return `${GRADE_DOT} before:bg-mark-weak`;
}

function getBarColor(percentage: number): string {
  if (percentage >= 80) return 'bg-mark-secure';
  if (percentage >= 70) return 'bg-mark-secure';
  if (percentage >= 60) return 'bg-mark-building';
  if (percentage >= 50) return 'bg-mark-weak';
  if (percentage >= 40) return 'bg-mark-weak';
  return 'bg-mark-weak';
}

export function AcademicSummaryCard({ academic }: AcademicSummaryCardProps) {
  if (academic.subjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Academic Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No marks recorded for the current term.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Academic Performance</CardTitle>
          <Badge variant="secondary" className="text-xs">
            Avg: {academic.termAverage}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {academic.subjects.map((subject) => (
            <div key={subject.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium truncate mr-2">{subject.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground">
                    {subject.mark}/{subject.total}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`text-xs px-1.5 py-0 ${getGradeColor(subject.percentage)}`}
                  >
                    {getGradeSymbol(subject.percentage)} ({subject.percentage}%)
                  </Badge>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${getBarColor(subject.percentage)}`}
                  style={{ width: `${Math.min(subject.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
