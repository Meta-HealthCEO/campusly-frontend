'use client';

import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import type { MatchStats, SportCodeConfig, StatField, PlayerMatchStats } from '@/types/sport';

interface MatchStatsViewProps {
  stats: MatchStats;
  sportConfig: SportCodeConfig;
}

export function MatchStatsView({ stats, sportConfig }: MatchStatsViewProps) {
  return (
    <div className="space-y-6">
      {/* Player stats table */}
      <div>
        <h4 className="mb-3 font-medium">Player Statistics</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-3 font-medium">Player</th>
                {sportConfig.positions.length > 0 && (
                  <th className="pb-2 pr-3 font-medium">Pos</th>
                )}
                {sportConfig.playerStatFields.map((f: StatField) => (
                  <th key={f.key} className="pb-2 pr-3 font-medium">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.playerStats.map((ps: PlayerMatchStats) => (
                <tr
                  key={ps.studentId}
                  className={`border-b ${ps.manOfMatch ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}
                >
                  <td className="py-2 pr-3 font-medium">
                    <span className="truncate">{ps.studentName ?? ps.studentId}</span>
                    {ps.manOfMatch && (
                      <Star className="ml-1 inline h-3.5 w-3.5 text-yellow-500" />
                    )}
                  </td>
                  {sportConfig.positions.length > 0 && (
                    <td className="py-2 pr-3">
                      <Badge variant="outline" className="text-xs">
                        {ps.position ?? '—'}
                      </Badge>
                    </td>
                  )}
                  {sportConfig.playerStatFields.map((field: StatField) => (
                    <td key={field.key} className="py-2 pr-3">
                      {formatStatValue(ps.stats[field.key], field)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team stats */}
      {Object.keys(stats.teamStats).length > 0 && (
        <div>
          <h4 className="mb-3 font-medium">Team Statistics</h4>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(stats.teamStats).map(([key, value]) => {
              const fieldDef = sportConfig.teamStatFields.find((f: StatField) => f.key === key);
              return (
                <div key={key} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {fieldDef?.label ?? key}
                  </p>
                  <p className="text-lg font-semibold">
                    {String(value)}{fieldDef?.unit ? ` ${fieldDef.unit}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatStatValue(
  value: number | string | boolean | undefined,
  field: StatField
): string {
  if (value === undefined || value === null) return '—';
  if (field.type === 'boolean') return value ? 'Yes' : 'No';
  const str = String(value);
  return field.unit ? `${str} ${field.unit}` : str;
}
