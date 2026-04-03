'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { SalaryRecord } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';

interface SalaryListProps {
  salaries: SalaryRecord[];
  onEdit: (salary: SalaryRecord) => void;
}

export function SalaryList({ salaries, onEdit }: SalaryListProps) {
  const columns = useMemo<ColumnDef<SalaryRecord>[]>(
    () => [
      {
        accessorKey: 'staffId',
        header: 'Name',
        cell: ({ row }) => {
          const staff = row.original.staffId;
          return (
            <span className="truncate font-medium">
              {staff.firstName} {staff.lastName}
            </span>
          );
        },
      },
      {
        accessorKey: 'department',
        header: 'Department',
        cell: ({ row }) => (
          <span className="truncate">{row.original.department ?? 'N/A'}</span>
        ),
      },
      {
        accessorKey: 'basicSalary',
        header: 'Basic Salary',
        cell: ({ row }) => formatCurrency(row.original.basicSalary),
      },
      {
        id: 'grossPay',
        header: 'Gross Pay',
        cell: ({ row }) => {
          const gross =
            row.original.basicSalary +
            row.original.allowances.reduce((s, a) => s + a.amount, 0);
          return formatCurrency(gross);
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
            {row.original.isActive ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [onEdit],
  );

  return <DataTable columns={columns} data={salaries} />;
}
