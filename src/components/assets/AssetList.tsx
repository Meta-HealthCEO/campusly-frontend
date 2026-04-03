'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Asset, AssetStatus, AssetCondition } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';

interface AssetListProps {
  assets: Asset[];
  onView: (id: string) => void;
}

type StatusVariant = 'default' | 'secondary' | 'outline' | 'destructive';

const STATUS_VARIANTS: Record<AssetStatus, StatusVariant> = {
  procured: 'secondary',
  in_service: 'default',
  under_repair: 'secondary',
  disposed: 'outline',
  lost: 'destructive',
  stolen: 'destructive',
};

const STATUS_LABELS: Record<AssetStatus, string> = {
  procured: 'Procured',
  in_service: 'In Service',
  under_repair: 'Under Repair',
  disposed: 'Disposed',
  lost: 'Lost',
  stolen: 'Stolen',
};

const CONDITION_LABELS: Record<AssetCondition, string> = {
  new: 'New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  damaged: 'Damaged',
};

function getCategoryName(categoryId: Asset['categoryId']): string {
  if (typeof categoryId === 'object' && categoryId !== null) return categoryId.name;
  return '—';
}

function getLocationName(locationId: Asset['locationId']): string {
  if (!locationId) return '—';
  if (typeof locationId === 'object') return locationId.name;
  return '—';
}

function getAssignedToName(assignedTo: Asset['assignedTo']): string {
  if (!assignedTo) return '—';
  if (typeof assignedTo === 'object') {
    return `${assignedTo.firstName} ${assignedTo.lastName}`;
  }
  return '—';
}

export function AssetList({ assets, onView }: AssetListProps) {
  const columns = useMemo<ColumnDef<Asset>[]>(
    () => [
      {
        accessorKey: 'assetTag',
        header: 'Asset Tag',
        cell: ({ row }) => (
          <span className="font-mono text-xs truncate">{row.original.assetTag}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <span className="font-medium truncate">{row.original.name}</span>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <span className="truncate">{getCategoryName(row.original.categoryId)}</span>
        ),
      },
      {
        id: 'location',
        header: 'Location',
        cell: ({ row }) => (
          <span className="truncate">{getLocationName(row.original.locationId)}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge variant={STATUS_VARIANTS[status]}>
              {STATUS_LABELS[status]}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'condition',
        header: 'Condition',
        cell: ({ row }) => {
          const condition = row.original.condition;
          if (!condition) return <span className="text-muted-foreground">—</span>;
          return <Badge variant="outline">{CONDITION_LABELS[condition]}</Badge>;
        },
      },
      {
        id: 'assignedTo',
        header: 'Assigned To',
        cell: ({ row }) => (
          <span className="truncate">{getAssignedToName(row.original.assignedTo)}</span>
        ),
      },
      {
        accessorKey: 'purchasePrice',
        header: 'Value',
        cell: ({ row }) => {
          const price = row.original.purchasePrice;
          return price != null ? formatCurrency(price) : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => onView(row.original.id)}>
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [onView],
  );

  return (
    <div className="overflow-x-auto">
      <DataTable columns={columns} data={assets} />
    </div>
  );
}
