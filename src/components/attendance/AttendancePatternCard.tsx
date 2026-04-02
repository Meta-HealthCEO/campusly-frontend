'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CalendarX, Clock, TrendingDown, Info } from 'lucide-react';
import type { AttendancePattern } from '@/types';

interface AttendancePatternCardProps {
  patterns: AttendancePattern | null;
  loading: boolean;
}

export function AttendancePatternCard({ patterns, loading }: AttendancePatternCardProps) {
  if (loading) return <LoadingSpinner />;
  if (!patterns) return null;

  const insights: string[] = [];
  if (patterns.mostMissedDay) {
    insights.push(
      `This student misses ${patterns.mostMissedDay}s most frequently -- consider follow-up.`,
    );
  }
  if (patterns.currentStreak > 2) {
    insights.push(
      `Currently on a ${patterns.currentStreak}-day absence streak.`,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Attendance Patterns</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-2">
            <CalendarX className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Most Missed Day</p>
              <p className="text-sm font-medium">{patterns.mostMissedDay ?? 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Most Missed Period</p>
              <p className="text-sm font-medium">
                {patterns.mostMissedPeriod !== null ? `Period ${patterns.mostMissedPeriod}` : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <TrendingDown className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Longest Streak</p>
              <p className="text-sm font-medium">{patterns.longestAbsenceStreak} days</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <TrendingDown className="h-4 w-4 mt-0.5 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Current Streak</p>
              <p className="text-sm font-medium">{patterns.currentStreak} days</p>
            </div>
          </div>
        </div>

        {patterns.monthlyBreakdown.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Monthly Breakdown</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="p-1 text-left text-muted-foreground">Month</th>
                    <th className="p-1 text-center text-muted-foreground">Present</th>
                    <th className="p-1 text-center text-muted-foreground">Absent</th>
                    <th className="p-1 text-center text-muted-foreground">Late</th>
                    <th className="p-1 text-center text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {patterns.monthlyBreakdown.map((m) => (
                    <tr key={m.month} className="border-b last:border-0">
                      <td className="p-1">{m.month}</td>
                      <td className="p-1 text-center">{m.present}</td>
                      <td className="p-1 text-center">{m.absent}</td>
                      <td className="p-1 text-center">{m.late}</td>
                      <td className="p-1 text-center font-medium">{m.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {insights.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Insights</AlertTitle>
            <AlertDescription>
              {insights.map((insight, i) => (
                <p key={i}>{insight}</p>
              ))}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
