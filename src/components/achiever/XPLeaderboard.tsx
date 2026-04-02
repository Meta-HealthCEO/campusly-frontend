'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudentLevel } from '@/types';

interface XPLeaderboardProps {
  entries: StudentLevel[];
  currentStudentId?: string;
}

const RANK_STYLES = [
  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
] as const;

export function XPLeaderboard({ entries, currentStudentId }: XPLeaderboardProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">XP Leaderboard</CardTitle></CardHeader>
        <CardContent>
          <EmptyState icon={Trophy} title="No data yet" description="The leaderboard will populate as students earn XP." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">XP Leaderboard</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const sid = entry.studentId ?? (entry.student?._id ?? '');
            const name = entry.studentUser
              ? `${entry.studentUser.firstName} ${entry.studentUser.lastName}`
              : `Student`;
            const isCurrentUser = currentStudentId === sid;

            return (
              <div
                key={entry.id || i}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3',
                  isCurrentUser && 'bg-primary/5 border-primary/30',
                )}
              >
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                  i < 3 ? RANK_STYLES[i] : 'bg-muted text-muted-foreground',
                )}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">Lvl {entry.level}</Badge>
                    <span className="text-xs text-muted-foreground">{entry.badges.length} badges</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold">{entry.xp}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
