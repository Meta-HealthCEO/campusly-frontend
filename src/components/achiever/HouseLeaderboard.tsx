'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Trophy, Crown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApiHousePoints } from '@/hooks/useAchiever';

interface HouseLeaderboardProps {
  houses: ApiHousePoints[];
  highlightHouseId?: string;
  loading: boolean;
  compact?: boolean;
}

function rankStyle(index: number): string {
  if (index === 0) return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400';
  if (index === 1) return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  if (index === 2) return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400';
  return 'bg-muted text-muted-foreground';
}

export function HouseLeaderboard({ houses, highlightHouseId, loading, compact }: HouseLeaderboardProps) {
  if (loading) return <LoadingSpinner />;

  const sorted = [...houses].sort((a, b) => b.totalPoints - a.totalPoints);

  const content = sorted.length === 0 ? (
    <EmptyState icon={Trophy} title="No houses" description="Houses will appear here once created." />
  ) : (
    <div className="space-y-2">
      {sorted.map((house, i) => (
        <div
          key={house._id}
          className={cn(
            'flex items-center gap-3 rounded-lg border p-3',
            house._id === highlightHouseId && 'bg-primary/5 ring-2 ring-primary'
          )}
        >
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold', rankStyle(i))}>
            {i === 0 ? <Crown className="h-4 w-4" /> : i + 1}
          </div>
          <div
            className="h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: house.houseColor }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: house.houseColor }}>{house.houseName}</p>
            {!compact && <p className="text-xs text-muted-foreground">Term {house.term}, {house.year}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-bold">{house.totalPoints}</span>
          </div>
        </div>
      ))}
    </div>
  );

  if (compact) return content;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          House Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
