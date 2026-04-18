import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { UserSearch } from 'lucide-react';
import type { AttendancePattern } from '@/types';

interface PatternCardProps {
  patterns: AttendancePattern | null;
  loading: boolean;
}

export function PatternCard({ patterns, loading }: PatternCardProps) {
  if (loading) return <LoadingSpinner />;
  if (!patterns) {
    return (
      <EmptyState
        icon={UserSearch}
        title="No patterns available"
        description="Select a student above to view their attendance patterns."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">Most Missed Day</p>
          <p className="text-lg font-semibold">
            {patterns.mostMissedDay ?? 'N/A'}
          </p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">Most Missed Period</p>
          <p className="text-lg font-semibold">
            {patterns.mostMissedPeriod != null
              ? `Period ${patterns.mostMissedPeriod}`
              : 'N/A'}
          </p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">Longest Streak</p>
          <p className="text-lg font-semibold">
            {patterns.longestAbsenceStreak} days
          </p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">Current Streak</p>
          <p className="text-lg font-semibold">
            {patterns.currentStreak} days
          </p>
        </div>
      </div>

      {patterns.monthlyBreakdown.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left font-medium text-muted-foreground">Month</th>
                <th className="p-2 text-center font-medium text-muted-foreground">Present</th>
                <th className="p-2 text-center font-medium text-muted-foreground">Absent</th>
                <th className="p-2 text-center font-medium text-muted-foreground">Late</th>
                <th className="p-2 text-center font-medium text-muted-foreground">%</th>
              </tr>
            </thead>
            <tbody>
              {patterns.monthlyBreakdown.map((m) => (
                <tr key={m.month} className="border-b last:border-0">
                  <td className="p-2 font-medium">{m.month}</td>
                  <td className="p-2 text-center">{m.present}</td>
                  <td className="p-2 text-center text-destructive">{m.absent}</td>
                  <td className="p-2 text-center">{m.late}</td>
                  <td className="p-2 text-center">
                    <Badge variant={m.percentage < 70 ? 'destructive' : 'secondary'}>
                      {m.percentage}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
