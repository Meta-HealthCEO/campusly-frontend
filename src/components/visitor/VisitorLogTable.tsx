'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VisitorPurposeBadge } from './VisitorPurposeBadge';
import { LogOut } from 'lucide-react';
import type { VisitorRecord, VisitorHost } from '@/types';

function getHostName(visitor: VisitorRecord): string {
  if (visitor.hostName) return visitor.hostName;
  if (visitor.hostId && typeof visitor.hostId === 'object') {
    const host = visitor.hostId as VisitorHost;
    return `${host.firstName} ${host.lastName}`;
  }
  return '—';
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface VisitorLogTableProps {
  visitors: VisitorRecord[];
  onCheckOut?: (visitor: VisitorRecord) => void;
}

export function VisitorLogTable({ visitors, onCheckOut }: VisitorLogTableProps) {
  const columns = useMemo<ColumnDef<VisitorRecord, unknown>[]>(() => [
    {
      accessorKey: 'passNumber',
      header: 'Pass #',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.passNumber}</span>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      accessorFn: (row: VisitorRecord) => `${row.firstName} ${row.lastName}`,
      cell: ({ row }) => (
        <span className="truncate font-medium">
          {row.original.firstName} {row.original.lastName}
        </span>
      ),
    },
    {
      accessorKey: 'purpose',
      header: 'Purpose',
      cell: ({ row }) => <VisitorPurposeBadge purpose={row.original.purpose} />,
    },
    {
      id: 'host',
      header: 'Visiting',
      cell: ({ row }) => (
        <span className="truncate text-sm">{getHostName(row.original)}</span>
      ),
    },
    {
      accessorKey: 'checkInTime',
      header: 'Check In',
      cell: ({ row }) => (
        <span className="text-sm">{formatTime(row.original.checkInTime)}</span>
      ),
    },
    {
      accessorKey: 'checkOutTime',
      header: 'Check Out',
      cell: ({ row }) => (
        <span className="text-sm">{formatTime(row.original.checkOutTime)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        row.original.status === 'checked_in'
          ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">On Premises</Badge>
          : <Badge variant="secondary">Checked Out</Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.status === 'checked_in' ? (
          <Button size="sm" variant="outline" onClick={() => onCheckOut?.(row.original)} disabled={!onCheckOut}>
            <LogOut className="h-3.5 w-3.5 mr-1" /> Check Out
          </Button>
        ) : null,
    },
  ], [onCheckOut]);

  return <DataTable columns={columns} data={visitors} searchKey="name" searchPlaceholder="Search visitors..." />;
}
