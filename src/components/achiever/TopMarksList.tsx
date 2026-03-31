'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TopMarkEntry, PopulatedStudent } from '@/hooks/useAchiever';

interface TopMarksListProps {
  entries: TopMarkEntry[];
  loading: boolean;
}

function getStudentDisplayName(s: PopulatedStudent): string {
  if (s.user) return `${s.user.firstName} ${s.user.lastName}`;
  if (s.firstName && s.lastName) return `${s.firstName} ${s.lastName}`;
  return s.admissionNumber ?? 'Unknown';
}

function rankStyle(index: number): string {
  if (index === 0) return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400';
  if (index === 1) return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  if (index === 2) return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400';
  return 'bg-muted text-muted-foreground';
}

export function TopMarksList({ entries, loading }: TopMarksListProps) {
  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Top by Marks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState icon={BarChart3} title="No mark data" description="Top achievers by marks will appear here once assessments are graded." />
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <div key={entry._id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold', rankStyle(i))}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getStudentDisplayName(entry.student)}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.totalMarks} assessment{entry.totalMarks !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">{entry.averagePercentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
