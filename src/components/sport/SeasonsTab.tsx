'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStandings } from '@/hooks/useSport';
import { deleteSeason } from '@/hooks/useSportMutations';
import { SeasonFormDialog } from './SeasonFormDialog';
import { StandingsTable } from './StandingsTable';
import type { Season } from '@/types/sport';

interface SeasonsTabProps {
  seasons: Season[];
  loading: boolean;
  schoolId: string;
  onRefresh: () => void;
}

function formatDate(d: string): string {
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

export function SeasonsTab({ seasons, loading, schoolId, onRefresh }: SeasonsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);

  const { standings, loading: standingsLoading, fetchStandings } = useStandings(activeSeason?.id ?? null);

  function openCreate() { setEditing(null); setDialogOpen(true); }
  function openEdit(s: Season) { setEditing(s); setDialogOpen(true); }

  function viewStandings(s: Season) {
    setActiveSeason(s);
  }

  async function handleDelete(s: Season) {
    if (!confirm(`Delete season "${s.name}"?`)) return;
    try {
      await deleteSeason(s.id);
      toast.success('Season deleted successfully');
      if (activeSeason?.id === s.id) setActiveSeason(null);
      onRefresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to delete season';
      toast.error(msg);
    }
  }

  const columns: ColumnDef<Season>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'sport', header: 'Sport' },
    { id: 'startDate', header: 'Start', cell: ({ row }) => formatDate(row.original.startDate) },
    { id: 'endDate', header: 'End', cell: ({ row }) => formatDate(row.original.endDate) },
    { id: 'status', header: 'Status', cell: ({ row }) => (
      <Badge className={
        row.original.isActive
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive'
      }>
        {row.original.isActive ? 'Active' : 'Inactive'}
      </Badge>
    )},
    { id: 'actions', header: 'Actions', enableSorting: false, cell: ({ row }) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); viewStandings(row.original); }} aria-label="View standings">
          <BarChart3 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); openEdit(row.original); }} aria-label="Edit season">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleDelete(row.original); }} aria-label="Delete season">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    )},
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Season
        </Button>
      </div>

      {seasons.length === 0 ? (
        <EmptyState icon={BarChart3} title="No seasons" description="Create a season to track standings." />
      ) : (
        <DataTable columns={columns} data={seasons} searchKey="name" searchPlaceholder="Search seasons..." />
      )}

      {activeSeason && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Standings: {activeSeason.name} ({activeSeason.sport})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StandingsTable
              standings={standings}
              loading={standingsLoading}
              onRecalculate={() => fetchStandings(true)}
            />
          </CardContent>
        </Card>
      )}

      <SeasonFormDialog
        open={dialogOpen} onOpenChange={setDialogOpen}
        schoolId={schoolId} season={editing} onSuccess={onRefresh}
      />
    </div>
  );
}
