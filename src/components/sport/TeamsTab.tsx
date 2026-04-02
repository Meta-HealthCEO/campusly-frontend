'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { deleteTeam } from '@/hooks/useSportMutations';
import { TeamFormDialog } from './TeamFormDialog';
import type { SportTeam, SportCoach } from '@/types/sport';

interface TeamsTabProps {
  teams: SportTeam[];
  loading: boolean;
  schoolId: string;
  onRefresh: () => void;
}

function getCoachName(coachId: SportCoach | string | null | undefined): string {
  if (!coachId) return '-';
  if (typeof coachId === 'string') return coachId;
  return `${coachId.firstName} ${coachId.lastName}`;
}

export function TeamsTab({ teams, loading, schoolId, onRefresh }: TeamsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<SportTeam | null>(null);

  function openCreate() {
    setEditingTeam(null);
    setDialogOpen(true);
  }

  function openEdit(team: SportTeam) {
    setEditingTeam(team);
    setDialogOpen(true);
  }

  async function handleDelete(team: SportTeam) {
    if (!confirm(`Delete team "${team.name}"?`)) return;
    try {
      await deleteTeam(team.id);
      toast.success('Sport team deleted successfully');
      onRefresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to delete team';
      toast.error(msg);
    }
  }

  const columns: ColumnDef<SportTeam>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'sport', header: 'Sport' },
    { accessorKey: 'ageGroup', header: 'Age Group',
      cell: ({ row }) => row.original.ageGroup || '-' },
    { id: 'coach', header: 'Coach',
      cell: ({ row }) => getCoachName(row.original.coachId) },
    { id: 'players', header: 'Players',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.playerIds?.length ?? 0}</Badge>
      )},
    { id: 'status', header: 'Status',
      cell: ({ row }) => (
        <Badge className={
          row.original.isActive
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive'
        }>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      )},
    { id: 'actions', header: 'Actions', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); openEdit(row.original); }} aria-label="Edit team">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleDelete(row.original); }} aria-label="Delete team">
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
          <Plus className="mr-2 h-4 w-4" /> New Team
        </Button>
      </div>

      {teams.length === 0 ? (
        <EmptyState icon={Users} title="No teams" description="Create your first sport team to get started." />
      ) : (
        <DataTable columns={columns} data={teams} searchKey="name" searchPlaceholder="Search teams..." />
      )}

      <TeamFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schoolId={schoolId}
        team={editingTeam}
        onSuccess={onRefresh}
      />
    </div>
  );
}
