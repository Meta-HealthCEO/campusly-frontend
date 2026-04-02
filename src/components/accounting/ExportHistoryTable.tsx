'use client';

import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import { extractErrorMessage } from '@/lib/api-helpers';
import type { AccountingExport } from '@/types';

interface Props {
  exports: AccountingExport[];
  loading: boolean;
  onDownload: (exportId: string) => Promise<string | null>;
}

const FORMAT_LABELS: Record<string, string> = {
  csv: 'CSV',
  sage_csv: 'Sage',
  xero_csv: 'Xero',
  pastel_csv: 'Pastel',
  quickbooks_iif: 'QuickBooks',
};

function StatusBadge({ status }: { status: string }) {
  if (status === 'ready') return <Badge variant="default">Ready</Badge>;
  if (status === 'generating') return <Badge variant="secondary">Generating</Badge>;
  return <Badge variant="destructive">Failed</Badge>;
}

export function ExportHistoryTable({ exports: exportList, loading, onDownload }: Props) {
  const handleDownload = async (row: AccountingExport) => {
    try {
      const url = await onDownload(row.id);
      if (!url) {
        toast.error('Export not available for download');
        return;
      }
      // Decode base64 data URL and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = row.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Download failed'));
    }
  };

  const columns: ColumnDef<AccountingExport>[] = [
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      accessorKey: 'format',
      header: 'Format',
      cell: ({ row }) => FORMAT_LABELS[row.original.format] ?? row.original.format,
    },
    {
      id: 'dateRange',
      header: 'Period',
      cell: ({ row }) => {
        const dr = row.original.dateRange;
        return `${formatDate(dr.from)} - ${formatDate(dr.to)}`;
      },
    },
    {
      accessorKey: 'recordCount',
      header: 'Records',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.status === 'ready' ? (
          <Button size="sm" variant="ghost" onClick={() => handleDownload(row.original)}>
            <Download className="h-4 w-4" />
          </Button>
        ) : null,
    },
  ];

  if (loading) return <LoadingSpinner />;
  if (exportList.length === 0) {
    return <EmptyState icon={Download} title="No exports yet" description="Generate your first export using the button above." />;
  }

  return <DataTable columns={columns} data={exportList} />;
}
