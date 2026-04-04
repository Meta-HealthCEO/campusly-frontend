'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { formatCurrency } from '@/lib/utils';
import type { AssetIncident, AssetIncidentType, AssetIncidentStatus } from '@/types';

interface IncidentListProps {
  incidents: AssetIncident[];
  onEdit?: (incident: AssetIncident) => void;
}

const typeVariants: Record<
  AssetIncidentType,
  'secondary' | 'destructive' | 'outline'
> = {
  damage: 'secondary',
  loss: 'destructive',
  theft: 'destructive',
  vandalism: 'outline',
};

const typeLabels: Record<AssetIncidentType, string> = {
  damage: 'Damage',
  loss: 'Loss',
  theft: 'Theft',
  vandalism: 'Vandalism',
};

const statusLabels: Record<AssetIncidentStatus, string> = {
  reported: 'Reported',
  investigating: 'Investigating',
  resolved: 'Resolved',
};

const statusVariants: Record<AssetIncidentStatus, 'secondary' | 'outline' | 'default'> = {
  reported: 'secondary',
  investigating: 'outline',
  resolved: 'default',
};

function getAssetName(assetId: AssetIncident['assetId']): string {
  if (typeof assetId === 'object' && assetId !== null) return assetId.name;
  return String(assetId);
}

function getReporterName(reportedBy: AssetIncident['reportedBy']): string {
  if (typeof reportedBy === 'object' && reportedBy !== null) {
    return `${reportedBy.firstName} ${reportedBy.lastName}`;
  }
  return String(reportedBy);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}

export function IncidentList({ incidents, onEdit }: IncidentListProps) {
  const columns: ColumnDef<AssetIncident>[] = [
    {
      id: 'asset',
      header: 'Asset',
      cell: ({ row }) => (
        <span className="font-medium truncate block max-w-35">
          {getAssetName(row.original.assetId)}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => {
        const type = getValue() as AssetIncidentType;
        return (
          <Badge variant={typeVariants[type]}>
            {typeLabels[type]}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      id: 'reportedBy',
      header: 'Reported By',
      cell: ({ row }) => (
        <span className="truncate block max-w-32.5">
          {getReporterName(row.original.reportedBy)}
        </span>
      ),
    },
    {
      accessorKey: 'estimatedCost',
      header: 'Est. Cost',
      cell: ({ getValue }) => {
        const val = getValue() as number | undefined;
        return val != null ? formatCurrency(val) : '—';
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue() as AssetIncidentStatus;
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
      data={incidents}
      searchKey="description"
      searchPlaceholder="Search incidents..."
    />
  );
}
