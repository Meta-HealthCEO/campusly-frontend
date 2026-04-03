'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ExportButton } from '@/components/shared/ExportButton';
import { VisitorPurposeBadge } from './VisitorPurposeBadge';
import { ShieldAlert, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OnPremisesVisitor } from '@/types';

interface OnPremisesPanelProps {
  visitors: OnPremisesVisitor[];
  totalCount: number;
  loading: boolean;
  schoolId: string;
}

export function OnPremisesPanel({ visitors, totalCount, loading, schoolId }: OnPremisesPanelProps) {
  const columns = useMemo<ColumnDef<OnPremisesVisitor, unknown>[]>(() => [
    {
      accessorKey: 'passNumber',
      header: 'Pass #',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.passNumber}</span>,
    },
    {
      id: 'name',
      header: 'Name',
      accessorFn: (row: OnPremisesVisitor) => `${row.firstName} ${row.lastName}`,
      cell: ({ row }) => (
        <span className="font-medium truncate">{row.original.firstName} {row.original.lastName}</span>
      ),
    },
    {
      accessorKey: 'purpose',
      header: 'Purpose',
      cell: ({ row }) => <VisitorPurposeBadge purpose={row.original.purpose} />,
    },
    {
      accessorKey: 'hostName',
      header: 'Visiting',
      cell: ({ row }) => <span className="text-sm truncate">{row.original.hostName ?? '—'}</span>,
    },
    {
      accessorKey: 'checkInTime',
      header: 'Since',
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.original.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => <span className="text-sm">{row.original.duration ?? '—'}</span>,
    },
    {
      accessorKey: 'vehicleRegistration',
      header: 'Vehicle',
      cell: ({ row }) => <span className="text-sm">{row.original.vehicleRegistration ?? '—'}</span>,
    },
  ], []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-base">Emergency On-Premises Register</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{totalCount} visitor(s) currently on premises</span>
            </div>
            <ExportButton
              endpoint="/visitors/on-premises/export"
              filename="on-premises-visitors"
              params={{ schoolId }}
              label="Export CSV"
            />
          </div>
        </CardContent>
      </Card>

      {visitors.length === 0 ? (
        <EmptyState icon={Users} title="No visitors on premises" description="All visitors have been checked out." />
      ) : (
        <DataTable columns={columns} data={visitors} searchKey="name" searchPlaceholder="Search on-premises visitors..." />
      )}
    </div>
  );
}
