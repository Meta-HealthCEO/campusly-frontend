'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import { ChannelIcon } from './ChannelIcon';
import { formatDate } from '@/lib/utils';
import type { DeliveryLog } from '@/types';

interface DeliveryLogDataTableProps {
  logs: DeliveryLog[];
  onRetry: (logId: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

function formatCost(val: number): string {
  return val > 0 ? `R${val.toFixed(2)}` : 'Free';
}

export function DeliveryLogDataTable({
  logs, onRetry, page, totalPages, onPageChange,
}: DeliveryLogDataTableProps) {
  const columns = useMemo<ColumnDef<DeliveryLog, unknown>[]>(() => [
    {
      accessorKey: 'recipientName',
      header: 'Recipient',
      cell: ({ row }) => (
        <div>
          <p className="font-medium truncate max-w-[140px]">{row.original.recipientName || '-'}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[140px]">
            {row.original.recipientEmail ?? row.original.recipientPhone ?? ''}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'channel',
      header: 'Channel',
      cell: ({ row }) => <ChannelIcon channel={row.original.channel} showLabel />,
    },
    {
      accessorKey: 'subject',
      header: 'Subject',
      cell: ({ row }) => (
        <span className="text-sm truncate max-w-[180px] inline-block">{row.original.subject || '-'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <DeliveryStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'sentAt',
      header: 'Sent At',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.sentAt ? formatDate(row.original.sentAt, 'dd MMM HH:mm') : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'cost',
      header: 'Cost',
      cell: ({ row }) => (
        <span className="text-sm">{formatCost(row.original.cost)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        if (row.original.status !== 'failed' && row.original.status !== 'bounced') return null;
        return (
          <Button variant="ghost" size="icon-sm" onClick={() => onRetry(row.original.id)}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        );
      },
    },
  ], [onRetry]);

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={logs} searchKey="recipientName" searchPlaceholder="Search recipients..." />
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
