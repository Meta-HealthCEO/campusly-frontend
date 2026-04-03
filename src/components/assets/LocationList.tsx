'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import type { AssetLocation, LocationType } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';

interface LocationListProps {
  locations: AssetLocation[];
  onEdit: (loc: AssetLocation) => void;
  onDelete: (id: string) => void;
}

const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  building: 'Building',
  room: 'Room',
  hall: 'Hall',
  field: 'Field',
  storage: 'Storage',
  office: 'Office',
  other: 'Other',
};

export function LocationList({ locations, onEdit, onDelete }: LocationListProps) {
  const columns = useMemo<ColumnDef<AssetLocation>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <span className="font-medium truncate">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant="secondary">
            {LOCATION_TYPE_LABELS[row.original.type]}
          </Badge>
        ),
      },
      {
        accessorKey: 'building',
        header: 'Building',
        cell: ({ row }) => (
          <span className="truncate">{row.original.building ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'floor',
        header: 'Floor',
        cell: ({ row }) => (
          <span className="truncate">{row.original.floor ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'department',
        header: 'Department',
        cell: ({ row }) => (
          <span className="truncate">{row.original.department ?? '—'}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(row.original.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, onDelete],
  );

  return (
    <div className="overflow-x-auto">
      <DataTable columns={columns} data={locations} />
    </div>
  );
}
