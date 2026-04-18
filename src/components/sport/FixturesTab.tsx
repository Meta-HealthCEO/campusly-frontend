'use client';

import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Calendar, Eye, Home, Plane, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { deleteFixture } from '@/hooks/useSportMutations';
import { FixtureFormDialog } from './FixtureFormDialog';
import { FixtureDetailPanel } from './FixtureDetailPanel';
import { FixtureCalendarView } from './FixtureCalendarView';
import type { SportFixture, SportTeam, SportTeamRef, SportPlayer } from '@/types/sport';

interface FixturesTabProps {
  fixtures: SportFixture[];
  teams: SportTeam[];
  loading: boolean;
  schoolId: string;
  onRefresh: () => void;
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

export function FixturesTab({ fixtures, teams, loading, schoolId, onRefresh }: FixturesTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SportFixture | null>(null);
  const [detailFixture, setDetailFixture] = useState<SportFixture | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filterTeamId, setFilterTeamId] = useState('__all__');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const filtered = useMemo(() => {
    if (filterTeamId === '__all__') return fixtures;
    return fixtures.filter((f) => {
      const tRef = f.teamId;
      const tId = typeof tRef === 'string' ? tRef : tRef._id;
      return tId === filterTeamId;
    });
  }, [fixtures, filterTeamId]);

  function openCreate() { setEditing(null); setDialogOpen(true); }
  function openEdit(f: SportFixture) { setEditing(f); setDialogOpen(true); }
  function openDetail(f: SportFixture) { setDetailFixture(f); setDetailOpen(true); }

  async function handleDelete(f: SportFixture) {
    if (!confirm(`Delete fixture vs "${f.opponent}"?`)) return;
    try {
      await deleteFixture(f.id);
      toast.success('Sport fixture deleted successfully');
      onRefresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to delete fixture';
      toast.error(msg);
    }
  }

  const columns: ColumnDef<SportFixture>[] = [
    { id: 'team', header: 'Team', cell: ({ row }) => getTeamName(row.original.teamId) },
    { accessorKey: 'opponent', header: 'Opponent' },
    { id: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
    { accessorKey: 'time', header: 'Time' },
    { accessorKey: 'venue', header: 'Venue' },
    { id: 'homeAway', header: 'H/A', cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.isHome ? <><Home className="mr-1 h-3 w-3" />H</> : <><Plane className="mr-1 h-3 w-3" />A</>}
      </Badge>
    )},
    { id: 'result', header: 'Result', cell: ({ row }) => (
      row.original.result
        ? <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{row.original.result}</Badge>
        : <span className="text-muted-foreground text-xs">-</span>
    )},
    { id: 'actions', header: 'Actions', enableSorting: false, cell: ({ row }) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); openDetail(row.original); }} aria-label="View fixture">
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); generateTeamSheet(row.original); }} aria-label="Publish team sheet">
          <ClipboardList className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); openEdit(row.original); }} aria-label="Edit fixture">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleDelete(row.original); }} aria-label="Delete fixture">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    )},
  ];

  async function generateTeamSheet(fixture: SportFixture) {
    if (!confirm(`Publish a team sheet for ${getTeamName(fixture.teamId)} vs ${fixture.opponent}?`)) return;
    try {
      await apiClient.post(`/sports/fixtures/${fixture.id}/team-sheet`);
      toast.success('Team sheet published');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Failed to publish team sheet';
      toast.error(message);
    }
  }

  if (loading) return <LoadingSpinner />;

  const detailPlayers = detailFixture ? getPlayersForFixture(detailFixture, teams) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Select value={filterTeamId} onValueChange={(val: unknown) => setFilterTeamId(val as string)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All teams</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"
            onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}>
            <Calendar className="mr-1 h-4 w-4" />
            {viewMode === 'list' ? 'Calendar' : 'List'}
          </Button>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Fixture
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Calendar} title="No fixtures" description="Schedule your first match." />
      ) : viewMode === 'list' ? (
        <DataTable columns={columns} data={filtered} searchKey="opponent" searchPlaceholder="Search fixtures..." />
      ) : (
        <FixtureCalendarView fixtures={filtered} onFixtureClick={openDetail} />
      )}

      <FixtureFormDialog
        open={dialogOpen} onOpenChange={setDialogOpen}
        schoolId={schoolId} teams={teams} fixture={editing} onSuccess={onRefresh}
      />
      <FixtureDetailPanel
        open={detailOpen} onOpenChange={setDetailOpen}
        fixture={detailFixture} schoolId={schoolId} players={detailPlayers}
        onResultSaved={onRefresh}
      />
    </div>
  );
}
