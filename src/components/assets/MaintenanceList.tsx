'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { formatCurrency } from '@/lib/utils';
import type { AssetMaintenance, MaintenanceType, MaintenanceStatus } from '@/types';

interface MaintenanceListProps {
  records: AssetMaintenance[];
  onEdit?: (record: AssetMaintenance) => void;
}

const typeLabels: Record<MaintenanceType, string> = {
  repair: 'Repair',
  service: 'Service',
  upgrade: 'Upgrade',
  inspection: 'Inspection',
};

const statusVariants: Record<
  MaintenanceStatus,
  'secondary' | 'outline' | 'default' | 'destructive'
> = {
  scheduled: 'secondary',
  in_progress: 'outline',
  completed: 'default',
  cancelled: 'destructive',
};

const statusLabels: Record<MaintenanceStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function getAssetName(assetId: AssetMaintenance['assetId']): string {
  if (typeof assetId === 'object' && assetId !== null) return assetId.name;
  return String(assetId);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString();
}

export function MaintenanceList({ records, onEdit }: MaintenanceListProps) {
  const columns: ColumnDef<AssetMaintenance>[] = [
    {
      id: 'asset',
      header: 'Asset',
      cell: ({ row }) => (
        <span className="font-medium truncate block max-w-[140px]">
          {getAssetName(row.original.assetId)}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => (
        <Badge variant="secondary">
          {typeLabels[getValue() as MaintenanceType]}
        </Badge>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ getValue }) => (
        <span className="line-clamp-2 max-w-[180px]">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'vendor',
      header: 'Vendor',
      cell: ({ getValue }) => (getValue() as string | undefined) ?? '—',
    },
    {
      accessorKey: 'cost',
      header: 'Cost',
      cell: ({ getValue }) => {
        const val = getValue() as number | undefined;
        return val != null ? formatCurrency(val) : '—';
      },
    },
    {
      accessorKey: 'scheduledDate',
      header: 'Scheduled',
      cell: ({ getValue }) => formatDate(getValue() as string | undefined),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue() as MaintenanceStatus;
        return (
          <Badge variant={statusVariants[status]}>
            {statusLabels[status]}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) =>
        onEdit ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(row.original)}
          >
            Edit
          </Button>
        ) : null,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={records}
      searchKey="description"
      searchPlaceholder="Search maintenance..."
    />
  );
}
