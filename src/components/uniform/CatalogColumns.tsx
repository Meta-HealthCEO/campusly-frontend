'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Pencil, Trash2, Ruler, ToggleLeft, ToggleRight } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { UniformItem } from './types';

interface CatalogColumnActions {
  onEdit: (item: UniformItem) => void;
  onDelete: (item: UniformItem) => void;
  onSizeGuide: (item: UniformItem) => void;
  onToggleAvailability: (item: UniformItem) => void;
}

export function getCatalogColumns(actions: CatalogColumnActions): ColumnDef<UniformItem, unknown>[] {
  return [
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
      id: 'sizes',
      header: 'Sizes',
      cell: ({ row }) =>
        row.original.sizes.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.original.sizes.map((s) => (
              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      id: 'price',
      header: 'Price',
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.price)}</span>
      ),
    },
    {
      accessorKey: 'stock',
      header: 'Stock',
      cell: ({ row }) => {
        const { stock, lowStockThreshold } = row.original;
        const isLow = stock <= lowStockThreshold && stock > 0;
        const isOut = stock === 0;
        return (
          <span
            className={
              isOut
                ? 'text-destructive font-medium'
                : isLow
                  ? 'text-amber-600 font-medium'
                  : ''
            }
          >
            {stock}
            {isOut ? ' (Out)' : isLow ? ' (Low)' : ''}
          </span>
        );
      },
    },
    {
      id: 'available',
      header: 'Available',
      cell: ({ row }) => (
        <Badge
          className={
            row.original.isAvailable
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive'
          }
        >
          {row.original.isAvailable ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); actions.onSizeGuide(row.original); }}
            title="Size guide"
            aria-label="Size guide"
          >
            <Ruler className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); actions.onToggleAvailability(row.original); }}
            title="Toggle availability"
            aria-label="Toggle availability"
          >
            {row.original.isAvailable
              ? <ToggleRight className="h-3.5 w-3.5 text-emerald-600" />
              : <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />
            }
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); actions.onEdit(row.original); }}
            title="Edit item"
            aria-label="Edit item"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); actions.onDelete(row.original); }}
            title="Delete item"
            aria-label="Delete item"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];
}
