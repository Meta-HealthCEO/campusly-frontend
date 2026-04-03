'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { SeverityBadge } from './SeverityBadge';
import { IncidentStatusBadge } from './IncidentStatusBadge';
import type { Incident } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';

interface IncidentTableProps {
  incidents: Incident[];
  onRowClick?: (incident: Incident) => void;
}

export function IncidentTable({ incidents, onRowClick }: IncidentTableProps) {
  const columns = useMemo<ColumnDef<Incident>[]>(() => [
    {
      accessorKey: 'incidentNumber',
      header: 'Ref',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.incidentNumber}</span>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <span className="truncate max-w-[200px] block">{row.original.title}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="capitalize text-sm">
          {row.original.type.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <IncidentStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'incidentDate',
      header: 'Date',
      cell: ({ row }) => {
        const d = new Date(row.original.incidentDate);
        return <span className="text-sm">{d.toLocaleDateString()}</span>;
      },
    },
    {
      accessorKey: 'reportedBy',
      header: 'Reported By',
      cell: ({ row }) => {
        const r = row.original.reportedBy;
        return (
          <span className="text-sm truncate">
            {r?.firstName ?? ''} {r?.lastName ?? ''}
          </span>
        );
      },
    },
  ], []);

  return (
    <DataTable
      columns={columns}
      data={incidents}
      onRowClick={onRowClick}
    />
  );
}
