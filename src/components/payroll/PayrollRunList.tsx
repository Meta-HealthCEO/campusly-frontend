'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { PayrollRun, PayrollRunStatus } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const STATUS_CONFIG: Record<PayrollRunStatus, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
  draft: { variant: 'secondary', label: 'Draft' },
  reviewed: { variant: 'outline', label: 'Reviewed' },
  approved: { variant: 'default', label: 'Approved' },
  processed: { variant: 'default', label: 'Processed' },
};

interface PayrollRunListProps {
  runs: PayrollRun[];
  onViewRun: (id: string) => void;
}

export function PayrollRunList({ runs, onViewRun }: PayrollRunListProps) {
  const columns = useMemo<ColumnDef<PayrollRun>[]>(
    () => [
      {
        id: 'period',
        header: 'Period',
        cell: ({ row }) => {
          const { month, year } = row.original;
          return (
            <span className="font-medium truncate">
              {MONTH_NAMES[month - 1]} {year}
            </span>
          );
        },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="truncate text-muted-foreground">
            {row.original.description ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const cfg = STATUS_CONFIG[row.original.status];
          return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
        },
      },
      {
        id: 'employees',
        header: 'Employees',
        cell: ({ row }) => row.original.totals.employeeCount,
      },
      {
        id: 'totalNetPay',
        header: 'Total Net Pay',
        cell: ({ row }) => formatCurrency(row.original.totals.totalNetPay),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => onViewRun(row.original.id)}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        ),
      },
    ],
    [onViewRun],
  );

  return <DataTable columns={columns} data={runs} />;
}
