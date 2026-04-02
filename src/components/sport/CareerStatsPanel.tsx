'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3, Trophy, Star } from 'lucide-react';
import type { CareerStats, SeasonStats } from '@/types/sport';

interface CareerStatsPanelProps {
  careerStats: CareerStats | null;
  loading: boolean;
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}

export function CareerStatsPanel({ careerStats, loading }: CareerStatsPanelProps) {
  if (loading) return <LoadingSpinner />;

  if (!careerStats) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No career stats"
        description="Select a sport above to view career statistics."
      />
    );
  }

  const totalStatEntries = Object.entries(careerStats.totalStats);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{careerStats.totalAppearances}</p>
            <p className="text-xs text-muted-foreground">Total Appearances</p>
          </CardContent>
        </Card>
        {totalStatEntries.slice(0, 5).map(([key, value]) => (
          <Card key={key}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground capitalize truncate">{key}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Best match highlight */}
      {careerStats.bestMatch && (
        <Card className="border-yellow-400/40 bg-yellow-50/50 dark:bg-yellow-900/10">
          <CardContent className="flex items-start gap-3 p-4">
            <Star className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
            <div>
              <p className="text-sm font-semibold">Best Match</p>
              <p className="text-sm text-muted-foreground">
                {careerStats.bestMatch.summary} vs {careerStats.bestMatch.opponent}{' '}
                ({formatDate(careerStats.bestMatch.date)})
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-season breakdown */}
      {careerStats.seasons.length > 0 && (
        <div>
          <h4 className="mb-3 font-semibold">Season Breakdown</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-3 font-medium">Season</th>
                  <th className="pb-2 pr-3 font-medium">Apps</th>
                  {totalStatEntries.slice(0, 4).map(([key]) => (
                    <th key={key} className="pb-2 pr-3 font-medium capitalize">{key}</th>
                  ))}
                  <th className="pb-2 font-medium">Highlights</th>
                </tr>
              </thead>
              <tbody>
                {careerStats.seasons.map((season: SeasonStats) => (
                  <tr key={season.seasonId} className="border-b">
                    <td className="py-2 pr-3 font-medium truncate max-w-[120px]">
                      {season.seasonName}
                    </td>
                    <td className="py-2 pr-3">{season.appearances}</td>
                    {totalStatEntries.slice(0, 4).map(([key]) => (
                      <td key={key} className="py-2 pr-3">
                        {season.stats[key] ?? '—'}
                      </td>
                    ))}
                    <td className="py-2">
                      {season.highlights.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {season.highlights.slice(0, 2).map((h: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {h}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
