'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import type { TeacherObservation } from '@/types';

interface ObservationTableProps {
  observations: TeacherObservation[];
  onSelect: (observation: TeacherObservation) => void;
}

function getName(val: string | { firstName: string; lastName: string }): string {
  if (typeof val === 'string') return val;
  return `${val.firstName} ${val.lastName}`;
}

function getLabel(val: string | { name: string }): string {
  if (typeof val === 'string') return val;
  return val.name;
}

function statusBadge(status: string) {
  switch (status) {
    case 'scheduled':
      return <Badge variant="outline">Scheduled</Badge>;
    case 'completed':
      return <Badge variant="default">Completed</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function ObservationTable({ observations, onSelect }: ObservationTableProps) {
  const columns = useMemo<ColumnDef<TeacherObservation, unknown>[]>(() => [
    {
      accessorKey: 'teacherId',
      header: 'Teacher',
      cell: ({ row }) => (
        <span className="truncate">{getName(row.original.teacherId)}</span>
      ),
    },
    {
      accessorKey: 'classId',
      header: 'Class',
      cell: ({ row }) => getLabel(row.original.classId),
    },
    {
      accessorKey: 'subjectId',
      header: 'Subject',
      cell: ({ row }) => getLabel(row.original.subjectId),
    },
    {
      accessorKey: 'scheduledDate',
      header: 'Date',
      cell: ({ row }) => new Date(row.original.scheduledDate).toLocaleDateString(),
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => `${row.original.duration} min`,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => statusBadge(row.original.status),
    },
  ], []);

  if (observations.length === 0) {
    return (
      <EmptyState
        icon={Eye}
        title="No observations"
        description="Schedule a classroom observation to get started."
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={observations}
      searchKey="teacherId"
      searchPlaceholder="Search observations..."
      onRowClick={onSelect}
    />
  );
}
