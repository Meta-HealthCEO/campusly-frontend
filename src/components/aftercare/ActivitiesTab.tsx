'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ActivityFormDialog } from './ActivityFormDialog';
import type { AfterCareActivity, StudentOption } from '@/hooks/useAftercare';
import { getUserName } from '@/hooks/useAftercare';

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  homework_help: 'Homework Help',
  sport: 'Sport',
  free_play: 'Free Play',
  arts_crafts: 'Arts & Crafts',
  reading: 'Reading',
  other: 'Other',
};

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  homework_help: 'bg-blue-100 text-blue-800',
  sport: 'bg-green-100 text-green-800',
  free_play: 'bg-yellow-100 text-yellow-800',
  arts_crafts: 'bg-purple-100 text-purple-800',
  reading: 'bg-indigo-100 text-indigo-800',
  other: 'bg-gray-100 text-gray-800',
};

interface StaffOption {
  id: string;
  name: string;
}

interface ActivitiesTabProps {
  activities: AfterCareActivity[];
  students: StudentOption[];
  staff: StaffOption[];
  onCreate: (data: {
    date: string;
    activityType: string;
    name: string;
    description?: string;
    supervisorId: string;
    studentIds: string[];
    startTime: string;
    endTime: string;
  }) => Promise<void>;
  onUpdate: (id: string, data: Partial<{
    date: string;
    activityType: string;
    name: string;
    description: string;
    supervisorId: string;
    studentIds: string[];
    startTime: string;
    endTime: string;
  }>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ActivitiesTab({
  activities, students, staff, onCreate, onUpdate, onDelete,
}: ActivitiesTabProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AfterCareActivity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AfterCareActivity | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onDelete(deleteTarget.id);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Operation failed';
      toast.error(msg);
    }
    setDeleteTarget(null);
  };

  const columns: ColumnDef<AfterCareActivity>[] = [
    {
      accessorKey: 'name',
      header: 'Activity',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="secondary" className={ACTIVITY_TYPE_COLORS[row.original.activityType] ?? 'bg-gray-100 text-gray-800'}>
          {ACTIVITY_TYPE_LABELS[row.original.activityType] ?? row.original.activityType}
        </Badge>
      ),
    },
    {
      id: 'supervisor',
      header: 'Supervisor',
      cell: ({ row }) => getUserName(row.original.supervisorId),
    },
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }) => {
        try { return new Date(row.original.date).toLocaleDateString(); } catch { return row.original.date; }
      },
    },
    {
      id: 'time',
      header: 'Time',
      cell: ({ row }) => `${row.original.startTime} - ${row.original.endTime}`,
    },
    {
      id: 'students',
      header: 'Students',
      cell: ({ row }) => {
        const count = Array.isArray(row.original.studentIds) ? row.original.studentIds.length : 0;
        return `${count} student${count !== 1 ? 's' : ''}`;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="xs" variant="ghost" onClick={() => { setEditTarget(row.original); setFormOpen(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setDeleteTarget(row.original)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditTarget(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Activity
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={activities}
        searchKey="name"
        searchPlaceholder="Search activities..."
      />

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={(open) => { if (!open) setEditTarget(null); setFormOpen(open); }}
        activity={editTarget}
        students={students}
        staff={staff}
        onCreate={onCreate}
        onUpdate={onUpdate}
      />

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Activity</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
