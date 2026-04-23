'use client';

import { useState, useMemo } from 'react';
import { ClipboardList, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFixtureResults } from '@/hooks/useSport';
import { useCan } from '@/hooks/useCan';
import { ResultFormDialog } from './ResultFormDialog';
import type { SportFixture, SportTeam, SportTeamRef, MatchResult, SportPlayer } from '@/types/sport';

interface ResultsTabProps {
  fixtures: SportFixture[];
  teams: SportTeam[];
  loading: boolean;
  schoolId: string;
  onRefresh: () => void;
}

interface FixtureWithResult extends SportFixture {
  matchResult: MatchResult | null;
}

function getTeamName(teamId: SportTeamRef | string): string {
  if (typeof teamId === 'string') return teamId;
  return teamId.name ?? 'Unknown';
}

function formatDate(d: string): string {
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

function getPlayersForFixture(fixture: SportFixture, teams: SportTeam[]): SportPlayer[] {
  const tRef = fixture.teamId;
  const tId = typeof tRef === 'string' ? tRef : tRef._id;
  const team = teams.find((t) => t.id === tId || t._id === tId);
  return team?.playerIds ?? [];
}

export function ResultsTab({ fixtures, teams, loading, schoolId, onRefresh }: ResultsTabProps) {
  const canManage = useCan('manage_sport_config');
  const fixtureRefs = useMemo(() => fixtures.map((f) => ({ id: f.id })), [fixtures]);
  const { results: rawResults, loading: loadingResults, refetch: fetchResults } = useFixtureResults(fixtureRefs);
  const results = rawResults as unknown as Map<string, MatchResult>;
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState<SportFixture | null>(null);

  const fixturesWithResults: FixtureWithResult[] = fixtures.map((f) => ({
    ...f,
    matchResult: results.get(f.id) ?? null,
  }));

  function openResult(f: SportFixture) {
    setSelectedFixture(f);
    setResultDialogOpen(true);
  }

  function handleResultSaved() {
    fetchResults();
    onRefresh();
  }

  const selectedResult = selectedFixture ? results.get(selectedFixture.id) ?? null : null;
  const selectedPlayers = selectedFixture ? getPlayersForFixture(selectedFixture, teams) : [];

  const columns: ColumnDef<FixtureWithResult>[] = [
    { id: 'team', header: 'Team', cell: ({ row }) => getTeamName(row.original.teamId) },
    { accessorKey: 'opponent', header: 'Opponent' },
    { id: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
    { id: 'score', header: 'Score', cell: ({ row }) => {
      const r = row.original.matchResult;
      return r ? (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          {r.homeScore} - {r.awayScore}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">No result</span>
      );
    }},
    { id: 'actions', header: 'Actions', enableSorting: false, cell: ({ row }) => (
      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openResult(row.original); }} disabled={!canManage}>
        <Pencil className="mr-1 h-3 w-3" />
        {row.original.matchResult ? 'Edit Result' : 'Record Result'}
      </Button>
    )},
  ];

  if (loading || loadingResults) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {fixturesWithResults.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No fixtures" description="Schedule fixtures first, then record results." />
      ) : (
        <DataTable columns={columns} data={fixturesWithResults} searchKey="opponent" searchPlaceholder="Search by opponent..." />
      )}

      {selectedFixture && (
        <ResultFormDialog
          open={resultDialogOpen}
          onOpenChange={setResultDialogOpen}
          schoolId={schoolId}
          fixtureId={selectedFixture.id}
          players={selectedPlayers}
          existingResult={selectedResult}
          onSuccess={handleResultSaved}
        />
      )}
    </div>
  );
}
