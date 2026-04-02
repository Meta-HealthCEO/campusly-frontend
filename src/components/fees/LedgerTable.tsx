'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { StudentSelector } from '@/components/fees/StudentSelector';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLedgerEntries } from '@/hooks/useFeeDialogData';
import type { LedgerEntry } from '@/hooks/useFeeDialogData';

const typeStyles: Record<string, string> = {
  debit: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
  credit: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  payment: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  refund: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  write_off: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  interest: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  discount: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

interface LedgerTableProps {
  schoolId: string;
}

const columns: ColumnDef<LedgerEntry>[] = [
  {
    id: 'date',
    header: 'Date',
    cell: ({ row }) => row.original.createdAt ? formatDate(row.original.createdAt) : '—',
  },
  {
    id: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const t = row.original.type;
      const style = typeStyles[t] ?? 'bg-gray-100 text-gray-700';
      return (
        <Badge className={style}>
          {t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ')}
        </Badge>
      );
    },
  },
  { accessorKey: 'description', header: 'Description' },
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.reference || '—'}</span>
    ),
  },
  {
    id: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const t = row.original.type;
      const isCredit = ['credit', 'payment', 'refund', 'discount', 'write_off'].includes(t);
      return (
        <span className={isCredit ? 'text-emerald-600' : 'text-destructive'}>
          {isCredit ? '-' : '+'}{formatCurrency(row.original.amount)}
        </span>
      );
    },
  },
  {
    id: 'balance',
    header: 'Running Balance',
    cell: ({ row }) => (
      <span className="font-medium">{formatCurrency(row.original.runningBalance)}</span>
    ),
  },
];

export function LedgerTable({ schoolId }: LedgerTableProps) {
  const [studentId, setStudentId] = useState('');
  const { entries, loading } = useLedgerEntries(studentId, schoolId);

  return (
    <div className="space-y-4">
      <PageHeader title="Account Ledger" description="View the running financial ledger for a student" />
      <div className="max-w-sm">
        <StudentSelector
          value={studentId}
          onValueChange={setStudentId}
          label="Select Student"
          placeholder="Choose a student to view ledger..."
        />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading ledger...</p>
        </div>
      ) : studentId ? (
        <DataTable
          columns={columns}
          data={entries}
          searchKey="description"
          searchPlaceholder="Search ledger entries..."
        />
      ) : (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Select a student to view their account ledger.</p>
        </div>
      )}
    </div>
  );
}
