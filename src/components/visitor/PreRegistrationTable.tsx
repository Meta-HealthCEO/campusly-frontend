'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VisitorPurposeBadge } from './VisitorPurposeBadge';
import { X } from 'lucide-react';
import type { PreRegistration, PreRegistrationStatus } from '@/types';

const STATUS_STYLES: Record<PreRegistrationStatus, { label: string; className: string }> = {
  expected: { label: 'Expected', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  arrived: { label: 'Arrived', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400' },
  no_show: { label: 'No Show', className: 'bg-destructive/10 text-destructive' },
};

interface PreRegistrationTableProps {
  items: PreRegistration[];
  onCancel: (id: string) => void;
}

export function PreRegistrationTable({ items, onCancel }: PreRegistrationTableProps) {
  const columns = useMemo<ColumnDef<PreRegistration, unknown>[]>(() => [
    {
      id: 'name',
      header: 'Name',
      accessorFn: (row: PreRegistration) => `${row.firstName} ${row.lastName}`,
      cell: ({ row }) => (
        <span className="font-medium truncate">
          {row.original.firstName} {row.original.lastName}
        </span>
      ),
    },
    {
      accessorKey: 'expectedDate',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.original.expectedDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: 'expectedTime',
      header: 'Time',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.expectedTime ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'purpose',
      header: 'Purpose',
      cell: ({ row }) => <VisitorPurposeBadge purpose={row.original.purpose} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = STATUS_STYLES[row.original.status] ?? STATUS_STYLES.expected;
        return <Badge className={s.className}>{s.label}</Badge>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.status === 'expected' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCancel(row.original.id ?? row.original._id ?? '')}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
        ) : null,
    },
  ], [onCancel]);

  return <DataTable columns={columns} data={items} searchKey="name" searchPlaceholder="Search pre-registrations..." />;
}
