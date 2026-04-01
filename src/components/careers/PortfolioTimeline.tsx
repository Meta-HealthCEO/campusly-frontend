'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap } from 'lucide-react';
import type { AcademicYear } from '@/types';

interface PortfolioTimelineProps {
  academicHistory: AcademicYear[];
}

const promotionVariant: Record<
  AcademicYear['promotionStatus'],
  'default' | 'secondary' | 'destructive'
> = {
  promoted: 'default',
  condoned: 'secondary',
  retained: 'destructive',
};

export default function PortfolioTimeline({ academicHistory }: PortfolioTimelineProps) {
  const sorted = [...academicHistory].sort((a, b) => b.year - a.year);

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No academic history available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sorted.map((yr) => (
        <Card key={`${yr.year}-${yr.grade}`}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {yr.grade} &mdash; {yr.year}
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">APS {yr.totalAPS}</Badge>
              <Badge variant={promotionVariant[yr.promotionStatus]}>
                {yr.promotionStatus.charAt(0).toUpperCase() + yr.promotionStatus.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {yr.subjects.map((subj) => (
                <div
                  key={subj.subjectId}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {subj.name}{' '}
                      <span className="text-muted-foreground">({subj.code})</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {subj.finalPercentage}%
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0">
                    {subj.apsPoints} pts
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
