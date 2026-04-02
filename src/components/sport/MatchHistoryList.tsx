'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { CalendarDays, MapPin, Star } from 'lucide-react';
import type { StudentMatchEntry } from '@/types/sport';

interface MatchHistoryListProps {
  matches: StudentMatchEntry[];
  loading: boolean;
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}

function resultBadgeVariant(result: string | null | undefined): 'default' | 'secondary' | 'destructive' {
  if (!result) return 'secondary';
  const lower = result.toLowerCase();
  if (lower.includes('win') || lower.includes('won')) return 'default';
  if (lower.includes('loss') || lower.includes('lost')) return 'destructive';
  return 'secondary';
}

export function MatchHistoryList({ matches, loading }: MatchHistoryListProps) {
  if (loading) return <LoadingSpinner />;

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No match history"
        description="No matches recorded yet for this sport."
      />
    );
  }

  const sorted = [...matches].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-3">
      {sorted.map((match) => {
        const statEntries = Object.entries(match.playerStats).filter(
          ([, v]) => v !== false && v !== '' && v !== 0
        );

        return (
          <Card key={match.fixtureId}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium truncate">
                      vs {match.opponent}
                    </h4>
                    {match.result && (
                      <Badge variant={resultBadgeVariant(match.result)}>
                        {match.result}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {match.isHome ? 'Home' : 'Away'}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatDate(match.date)}
                    </span>
                    {match.venue && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{match.venue}</span>
                      </span>
                    )}
                  </div>
                </div>

                {match.rating != null && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-semibold">{match.rating}/10</span>
                  </div>
                )}
              </div>

              {statEntries.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {statEntries.slice(0, 6).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs"
                    >
                      <span className="capitalize text-muted-foreground mr-1">{key}:</span>
                      <span className="font-medium">{String(value)}</span>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
