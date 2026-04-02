'use client';

import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { CreditCard, RotateCcw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { OnlinePayment } from '@/types';

const paymentTypeLabels: Record<string, string> = {
  fee_payment: 'Fee Payment',
  wallet_topup: 'Wallet Top-up',
  event_ticket: 'Event Ticket',
  uniform_order: 'Uniform Order',
  donation: 'Donation',
};

function getColumns(onRefund?: (payment: OnlinePayment) => void): ColumnDef<OnlinePayment, unknown>[] {
  return [
    {
      accessorKey: 'initiatedAt',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.initiatedAt, 'dd MMM yyyy HH:mm'),
    },
    {
      accessorKey: 'parentName',
      header: 'Parent',
      cell: ({ row }) => (
        <span className="truncate max-w-[140px] inline-block">
          {row.original.parentName ?? '-'}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.amount)}</span>
      ),
    },
    {
      accessorKey: 'paymentType',
      header: 'Type',
      cell: ({ row }) => paymentTypeLabels[row.original.paymentType] ?? row.original.paymentType,
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Method',
      cell: ({ row }) => row.original.paymentMethod?.toUpperCase() ?? '-',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <PaymentStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'receiptNumber',
      header: 'Receipt',
      cell: ({ row }) => (
        <span className="font-mono text-sm truncate">
          {row.original.receiptNumber ?? '-'}
        </span>
      ),
    },
    ...(onRefund
      ? [{
          id: 'actions' as const,
          header: '' as const,
          cell: ({ row }: { row: { original: OnlinePayment } }) => {
            if (row.original.status === 'completed') {
              return (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRefund(row.original)}
                  className="gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Refund
                </Button>
              );
            }
            return null;
          },
        }]
      : []),
  ];
}

interface OnlinePaymentsTableProps {
  payments: OnlinePayment[];
  onRefund?: (payment: OnlinePayment) => void;
}

export function OnlinePaymentsTable({ payments, onRefund }: OnlinePaymentsTableProps) {
  if (payments.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No online payments"
        description="Online payments will appear here once parents start paying."
      />
    );
  }

  return (
    <DataTable
      columns={getColumns(onRefund)}
      data={payments}
      searchKey="parentName"
      searchPlaceholder="Search by parent name..."
    />
  );
}
