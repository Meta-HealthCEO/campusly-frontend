'use client';

import { useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { DataTable } from '@/components/shared/DataTable';
import { formatCurrency } from '@/lib/utils';
import { useLowStock } from '@/hooks/useUniform';
import type { ColumnDef } from '@tanstack/react-table';
import type { UniformItem } from './types';

export function LowStockTab() {
  const { lowStockItems, loading, fetchLowStock } = useLowStock();

  useEffect(() => {
    fetchLowStock();
  }, [fetchLowStock]);

  const columns: ColumnDef<UniformItem, unknown>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.category.charAt(0).toUpperCase() + row.original.category.slice(1)}
        </Badge>
      ),
    },
    {
      id: 'price',
      header: 'Price',
      cell: ({ row }) => formatCurrency(row.original.price),
    },
    {
      id: 'stock',
      header: 'Current Stock',
      cell: ({ row }) => (
        <span className={row.original.stock === 0 ? 'text-destructive font-bold' : 'text-amber-600 font-medium'}>
          {row.original.stock}
        </span>
      ),
    },
    {
      id: 'threshold',
      header: 'Threshold',
      cell: ({ row }) => row.original.lowStockThreshold,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const isOut = row.original.stock === 0;
        return (
          <Badge
            className={
              isOut
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }
          >
            {isOut ? 'Out of Stock' : 'Low Stock'}
          </Badge>
        );
      },
    },
  ], []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {lowStockItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          All items are well-stocked.
        </div>
      ) : (
        <DataTable columns={columns} data={lowStockItems} searchKey="name" searchPlaceholder="Search low stock items..." />
      )}
    </div>
  );
}
