'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { Wallet } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { WalletTransaction } from '@/types';

const txColumns: ColumnDef<WalletTransaction, unknown>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.createdAt, 'dd MMM yyyy HH:mm'),
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.type;
      const styles: Record<string, string> = {
        topup: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        purchase: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        refund: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      };
      const labels: Record<string, string> = {
        topup: 'Top-up',
        purchase: 'Purchase',
        refund: 'Refund',
      };
      return (
        <Badge variant="secondary" className={styles[type] ?? ''}>
          {labels[type] ?? type}
        </Badge>
      );
    },
  },
  {
    id: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const { type, amount } = row.original;
      const isPositive = type === 'topup' || type === 'refund';
      return (
        <span className={isPositive ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
          {isPositive ? '+' : '-'}{formatCurrency(amount)}
        </span>
      );
    },
  },
  {
    id: 'balance',
    header: 'Balance After',
    cell: ({ row }) => formatCurrency(row.original.balance),
  },
];

interface WalletTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  transactions: WalletTransaction[];
  loading: boolean;
}

export function WalletTransactionsDialog({
  open,
  onOpenChange,
  studentName,
  transactions,
  loading,
}: WalletTransactionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transaction History - {studentName}</DialogTitle>
          <DialogDescription>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          {loading ? (
            <LoadingSpinner />
          ) : transactions.length > 0 ? (
            <DataTable
              columns={txColumns}
              data={transactions}
              searchKey="description"
              searchPlaceholder="Search transactions..."
            />
          ) : (
            <EmptyState
              icon={Wallet}
              title="No transactions yet"
              description="Transactions will appear here once the wallet is used."
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
