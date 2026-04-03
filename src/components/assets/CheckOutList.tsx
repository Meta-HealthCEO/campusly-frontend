'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import type { AssetCheckOut, CheckOutStatus } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';

interface CheckOutListProps {
  checkOuts: AssetCheckOut[];
  onCheckIn?: (assetId: string) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function resolveAssetName(assetId: AssetCheckOut['assetId']): string {
  if (typeof assetId === 'string') return assetId;
  return assetId.name;
}

function resolveAssetId(assetId: AssetCheckOut['assetId']): string {
  if (typeof assetId === 'string') return assetId;
  return assetId.id;
}

function resolveBorrowerName(borrowerId: AssetCheckOut['borrowerId']): string {
  if (typeof borrowerId === 'string') return borrowerId;
  return `${borrowerId.firstName} ${borrowerId.lastName}`;
}

const STATUS_BADGE_VARIANT: Record<CheckOutStatus, 'destructive' | 'secondary' | 'default'> = {
  overdue: 'destructive',
  checked_out: 'secondary',
  returned: 'default',
};

const STATUS_LABELS: Record<CheckOutStatus, string> = {
  overdue: 'Overdue',
  checked_out: 'Checked Out',
  returned: 'Returned',
};

export function CheckOutList({ checkOuts, onCheckIn }: CheckOutListProps) {
  const columns = useMemo<ColumnDef<AssetCheckOut>[]>(
    () => [
      {
        accessorKey: 'assetId',
        header: 'Asset',
        cell: ({ row }) => (
          <span className="font-medium truncate">{resolveAssetName(row.original.assetId)}</span>
        ),
      },
      {
        accessorKey: 'borrowerId',
        header: 'Borrower',
        cell: ({ row }) => (
          <span className="truncate">{resolveBorrowerName(row.original.borrowerId)}</span>
        ),
      },
      {
        accessorKey: 'checkedOutAt',
        header: 'Checked Out',
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDate(row.original.checkedOutAt)}</span>
        ),
      },
      {
        accessorKey: 'expectedReturnDate',
        header: 'Due Date',
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDate(row.original.expectedReturnDate)}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const s = row.original.status;
          return (
            <Badge variant={STATUS_BADGE_VARIANT[s]}>
              {STATUS_LABELS[s]}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          if (row.original.status !== 'checked_out') return null;
          const assetId = resolveAssetId(row.original.assetId);
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCheckIn?.(assetId)}
              className="whitespace-nowrap"
            >
              <LogIn className="h-4 w-4 mr-1" />
              Check In
            </Button>
          );
        },
      },
    ],
    [onCheckIn],
  );

  return (
    <div className="overflow-x-auto">
      <DataTable columns={columns} data={checkOuts} />
    </div>
  );
}
