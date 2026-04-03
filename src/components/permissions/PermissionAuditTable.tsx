'use client';

import { useMemo } from 'react';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import type { PermissionAuditEntry } from '@/types';

interface PermissionAuditTableProps {
  logs: PermissionAuditEntry[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

function formatChanges(changes: PermissionAuditEntry['changes']): string {
  return changes
    .map((c) => `${c.field}: ${String(c.oldValue)} → ${String(c.newValue)}`)
    .join(', ');
}

export function PermissionAuditTable({ logs }: PermissionAuditTableProps) {
  const columns = useMemo<ColumnDef<PermissionAuditEntry, unknown>[]>(() => [
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'changedBy',
      header: 'Changed By',
      cell: ({ row }) => {
        const u = row.original.userId;
        return (
          <span className="truncate text-sm">
            {u.firstName} {u.lastName}
          </span>
        );
      },
    },
    {
      id: 'target',
      header: 'Target User',
      cell: ({ row }) => (
        <span className="truncate text-sm text-muted-foreground">{row.original.entity}</span>
      ),
    },
    {
      id: 'changes',
      header: 'Changes',
      cell: ({ row }) => (
        <span className="text-sm line-clamp-2">{formatChanges(row.original.changes)}</span>
      ),
    },
  ], []);

  return <DataTable columns={columns} data={logs} />;
}
