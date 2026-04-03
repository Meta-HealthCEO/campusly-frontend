'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Expense, ExpenseStatus } from '@/types';

const STATUS_MAP: Record<ExpenseStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

function getCategoryName(cat: Expense['categoryId']): string {
  if (typeof cat === 'object' && cat !== null) return cat.name;
  return String(cat);
}

function getSubmitterName(sub: Expense['submittedBy']): string {
  if (typeof sub === 'object' && sub !== null) return sub.name;
  return String(sub);
}

interface ExpenseTableProps {
  expenses: Expense[];
  showApprovalActions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function ExpenseTable({
  expenses,
  showApprovalActions = false,
  onApprove,
  onReject,
}: ExpenseTableProps) {
  const columns = useMemo<ColumnDef<Expense, unknown>[]>(
    () => [
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="truncate max-w-[200px] block">{row.original.description}</span>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <span className="text-sm">{getCategoryName(row.original.categoryId)}</span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
      {
        id: 'submittedBy',
        header: 'Submitted By',
        cell: ({ row }) => (
          <span className="text-sm truncate">{getSubmitterName(row.original.submittedBy)}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const s = STATUS_MAP[row.original.status];
          return <Badge variant={s.variant}>{s.label}</Badge>;
        },
      },
      ...(showApprovalActions
        ? [
            {
              id: 'actions',
              header: 'Actions',
              cell: ({ row }: { row: { original: Expense } }) =>
                row.original.status === 'pending' ? (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onApprove?.(row.original.id)}
                    >
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onReject?.(row.original.id)}
                    >
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : null,
            } as ColumnDef<Expense, unknown>,
          ]
        : []),
    ],
    [showApprovalActions, onApprove, onReject],
  );

  return (
    <DataTable
      columns={columns}
      data={expenses}
      searchKey="description"
      searchPlaceholder="Search expenses..."
    />
  );
}
