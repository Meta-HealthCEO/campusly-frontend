'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { PayrollItem } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';

interface PayrollRunItemsTableProps {
  items: PayrollItem[];
  onAdjust?: (item: PayrollItem) => void;
}

export function PayrollRunItemsTable({ items, onAdjust }: PayrollRunItemsTableProps) {
  const columns = useMemo<ColumnDef<PayrollItem>[]>(
    () => [
      {
        id: 'employeeName',
        header: 'Employee Name',
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
        accessorKey: 'basicSalary',
        header: 'Basic',
        cell: ({ row }) => formatCurrency(row.original.basicSalary),
      },
      {
        accessorKey: 'allowances',
        header: 'Allowances',
        cell: ({ row }) => formatCurrency(row.original.allowances),
      },
      {
        accessorKey: 'grossPay',
        header: 'Gross',
        cell: ({ row }) => formatCurrency(row.original.grossPay),
      },
      {
        accessorKey: 'paye',
        header: 'PAYE',
        cell: ({ row }) => formatCurrency(row.original.paye),
      },
      {
        accessorKey: 'uifEmployee',
        header: 'UIF',
        cell: ({ row }) => formatCurrency(row.original.uifEmployee),
      },
      {
        id: 'deductions',
        header: 'Deductions',
        cell: ({ row }) => {
          const { preTaxDeductions, postTaxDeductions, leaveDeduction } = row.original;
          return formatCurrency(preTaxDeductions + postTaxDeductions + leaveDeduction);
        },
      },
      {
        accessorKey: 'netPay',
        header: 'Net Pay',
        cell: ({ row }) => (
          <span className="font-semibold">{formatCurrency(row.original.netPay)}</span>
        ),
      },
      ...(onAdjust
        ? [
            {
              id: 'actions',
              header: '',
              cell: ({ row }: { row: { original: PayrollItem } }) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAdjust(row.original)}
                  aria-label="Adjust payroll item"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ),
            } satisfies ColumnDef<PayrollItem>,
          ]
        : []),
    ],
    [onAdjust],
  );

  return <DataTable columns={columns} data={items} />;
}
