'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { SeasonStanding, SportTeamRef } from '@/types/sport';

interface StandingsTableProps {
  standings: SeasonStanding[];
  loading: boolean;
  onRecalculate: () => void;
}

function getTeamName(teamId: SportTeamRef | string): string {
  if (typeof teamId === 'string') return teamId;
  return teamId.name ?? 'Unknown';
}

export function StandingsTable({ standings, loading, onRecalculate }: StandingsTableProps) {
  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onRecalculate}>
          <RefreshCw className="mr-1 h-4 w-4" /> Recalculate
        </Button>
      </div>
      {standings.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          No standings data yet. Record match results and recalculate.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Pos</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-center">P</TableHead>
                <TableHead className="text-center">W</TableHead>
                <TableHead className="text-center">D</TableHead>
                <TableHead className="text-center">L</TableHead>
                <TableHead className="text-center">GF</TableHead>
                <TableHead className="text-center">GA</TableHead>
                <TableHead className="text-center">GD</TableHead>
                <TableHead className="text-center font-bold">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((row, idx) => (
                <TableRow key={row.id ?? idx}>
                  <TableCell className="font-medium">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{getTeamName(row.teamId)}</TableCell>
                  <TableCell className="text-center">{row.played}</TableCell>
                  <TableCell className="text-center">{row.won}</TableCell>
                  <TableCell className="text-center">{row.drawn}</TableCell>
                  <TableCell className="text-center">{row.lost}</TableCell>
                  <TableCell className="text-center">{row.goalsFor}</TableCell>
                  <TableCell className="text-center">{row.goalsAgainst}</TableCell>
                  <TableCell className="text-center">{row.goalsFor - row.goalsAgainst}</TableCell>
                  <TableCell className="text-center font-bold">{row.points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
