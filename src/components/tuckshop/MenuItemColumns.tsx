'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Pencil, Trash2, Package } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { TuckshopItem } from '@/types';

interface MenuItemWithExtras extends TuckshopItem {
  stock?: number;
  isDailySpecial?: boolean;
  isHalal?: boolean;
  isKosher?: boolean;
}

interface ColumnActions {
  onEdit: (item: TuckshopItem) => void;
  onDelete: (item: TuckshopItem) => void;
  onStock: (item: TuckshopItem) => void;
}

export function getMenuItemColumns(actions: ColumnActions): ColumnDef<MenuItemWithExtras, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.name}</span>
          {row.original.isDailySpecial && (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
              Special
            </Badge>
          )}
        </div>
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
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.price)}</span>
      ),
    },
    {
      id: 'stock',
      header: 'Stock',
      cell: ({ row }) => {
        const stock = row.original.stockCount ?? row.original.stock ?? 0;
        if (stock === -1) return <Badge variant="secondary">Unlimited</Badge>;
        const isLow = stock <= 10 && stock > 0;
        return (
          <span className={isLow ? 'text-amber-600 font-medium' : ''}>
            {stock}{isLow ? ' (Low)' : ''}
          </span>
        );
      },
    },
    {
      id: 'allergens',
      header: 'Allergens',
      cell: ({ row }) =>
        row.original.allergens.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.original.allergens.map((allergen) => (
              <Badge key={allergen} variant="outline" className="text-xs">
                {allergen}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">None</span>
        ),
    },
    {
      id: 'dietary',
      header: 'Dietary',
      cell: ({ row }) => {
        const flags: string[] = [];
        if (row.original.isHalal) flags.push('Halal');
        if (row.original.isKosher) flags.push('Kosher');
        return flags.length > 0 ? (
          <div className="flex gap-1">
            {flags.map((f) => (
              <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
            ))}
          </div>
        ) : null;
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
            onClick={(e) => { e.stopPropagation(); actions.onStock(row.original); }}
            title="Update stock"
            aria-label="Update stock"
          >
            <Package className="h-3.5 w-3.5" />
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
