'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useFeeSchedules } from '@/hooks/useAdminFees';
import type { FeeType } from '@/types';
import { ScheduleFormDialog } from './ScheduleFormDialog';
import { DeleteScheduleDialog } from './DeleteScheduleDialog';

export interface FeeSchedule {
  id: string;
  _id?: string;
  feeTypeId: FeeType | string;
  schoolId: string;
  academicYear: number;
  term?: number;
  dueDate: string;
  appliesTo: { type: 'school' | 'grade' | 'student'; targetId: string };
  isDeleted?: boolean;
  createdAt?: string;
}

interface FeeScheduleSectionProps {
  schoolId: string;
  feeTypes: FeeType[];
}

const scopeLabels: Record<string, string> = {
  school: 'Whole School',
  grade: 'Grade',
  student: 'Student',
};

export function FeeScheduleSection({ schoolId, feeTypes }: FeeScheduleSectionProps) {
  const { schedules: rawSchedules, grades, loading, refetch: fetchSchedules } = useFeeSchedules(schoolId);
  const schedules = rawSchedules as unknown as FeeSchedule[];
  const [createOpen, setCreateOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<FeeSchedule | null>(null);
  const [deleteSchedule, setDeleteSchedule] = useState<FeeSchedule | null>(null);

  const columns: ColumnDef<FeeSchedule>[] = [
    {
      id: 'feeType',
      header: 'Fee Type',
      cell: ({ row }) => {
        const ft = row.original.feeTypeId;
        return typeof ft === 'object' ? ft.name : ft;
      },
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const ft = row.original.feeTypeId;
        return typeof ft === 'object' ? formatCurrency(ft.amount) : '—';
      },
    },
    { accessorKey: 'academicYear', header: 'Year' },
    {
      id: 'term',
      header: 'Term',
      cell: ({ row }) => row.original.term ? `Term ${row.original.term}` : 'All',
    },
    {
      id: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => formatDate(row.original.dueDate),
    },
    {
      id: 'scope',
      header: 'Scope',
      cell: ({ row }) => (
        <Badge variant="secondary">
          {scopeLabels[row.original.appliesTo.type] ?? row.original.appliesTo.type}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditSchedule(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteSchedule(row.original)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fee Schedules</h2>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Schedule
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading schedules...</p>
      ) : (
        <DataTable columns={columns} data={schedules} searchKey="academicYear" searchPlaceholder="Search by year..." />
      )}

      <ScheduleFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        schedule={null}
        schoolId={schoolId}
        feeTypes={feeTypes}
        grades={grades}
        onSuccess={fetchSchedules}
      />

      <ScheduleFormDialog
        open={!!editSchedule}
        onOpenChange={(v) => { if (!v) setEditSchedule(null); }}
        schedule={editSchedule}
        schoolId={schoolId}
        feeTypes={feeTypes}
        grades={grades}
        onSuccess={fetchSchedules}
      />

      <DeleteScheduleDialog
        open={!!deleteSchedule}
        onOpenChange={(v) => { if (!v) setDeleteSchedule(null); }}
        schedule={deleteSchedule}
        onSuccess={fetchSchedules}
      />
    </div>
  );
}
