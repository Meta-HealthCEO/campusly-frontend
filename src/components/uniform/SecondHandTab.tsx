'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/DataTable';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSecondHand } from '@/hooks/useUniform';
import { useSecondHandMutations } from '@/hooks/useUniformMutations';
import type { ColumnDef } from '@tanstack/react-table';
import type { SecondHandListing, SecondHandCondition, PopulatedUser } from './types';

const STATUS_FILTER = [
  { value: 'all', label: 'All Statuses' },
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Sold' },
];

const CONDITION_COLORS: Record<SecondHandCondition, string> = {
  new: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  like_new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  good: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  fair: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  reserved: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  sold: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

function getParentName(parentId: string | PopulatedUser): string {
  if (typeof parentId === 'object' && parentId !== null) {
    return `${parentId.firstName} ${parentId.lastName}`;
  }
  return String(parentId).slice(-6);
}

export function SecondHandTab() {
  const { listings, loading, fetchListings } = useSecondHand();
  const { markSold: markListingSold, extractErrorMessage } = useSecondHandMutations();
  const [statusFilter, setStatusFilter] = useState('all');
  const [soldDialog, setSoldDialog] = useState<SecondHandListing | null>(null);

  useEffect(() => {
    fetchListings(statusFilter);
  }, [fetchListings, statusFilter]);

  const markSold = useCallback(async (listing: SecondHandListing) => {
    try {
      await markListingSold(listing.id);
      toast.success('Listing marked as sold');
      fetchListings(statusFilter);
      setSoldDialog(null);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to mark as sold'));
    }
  }, [fetchListings, statusFilter, markListingSold, extractErrorMessage]);

  const columns: ColumnDef<SecondHandListing, unknown>[] = useMemo(() => [
    {
      accessorKey: 'itemName',
      header: 'Item',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.itemName}</span>
      ),
    },
    {
      accessorKey: 'size',
      header: 'Size',
    },
    {
      id: 'condition',
      header: 'Condition',
      cell: ({ row }) => (
        <Badge className={CONDITION_COLORS[row.original.condition] ?? ''}>
          {row.original.condition.replace('_', ' ')}
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
      id: 'seller',
      header: 'Seller',
      cell: ({ row }) => getParentName(row.original.parentId),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={STATUS_COLORS[row.original.status] ?? ''}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'date',
      header: 'Listed',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const listing = row.original;
        return (
          <div className="flex items-center gap-1">
            {listing.status === 'reserved' && (
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); setSoldDialog(listing); }}
              >
                Mark Sold
              </Button>
            )}
            {listing.status === 'available' && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); setSoldDialog(listing); }}
              >
                Mark Sold
              </Button>
            )}
          </div>
        );
      },
    },
  ], []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <Select value={statusFilter} onValueChange={(val: unknown) => setStatusFilter(val as string)}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUS_FILTER.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DataTable columns={columns} data={listings} searchKey="itemName" searchPlaceholder="Search listings..." />

      <Dialog open={!!soldDialog} onOpenChange={() => setSoldDialog(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Mark as Sold</DialogTitle>
            <DialogDescription>
              Confirm that <strong>{soldDialog?.itemName}</strong> has been sold.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSoldDialog(null)}>Cancel</Button>
            <Button onClick={() => soldDialog && markSold(soldDialog)}>
              Confirm Sold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
