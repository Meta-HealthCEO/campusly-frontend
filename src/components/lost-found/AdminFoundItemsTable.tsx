'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import type { FoundItem } from '@/types';
import { categoryLabels, categoryStyles, foundStatusStyles } from './shared-styles';

interface AdminFoundItemsTableProps {
  items: FoundItem[];
  onClaim: (itemId: string) => Promise<void>;
  onVerify: (itemId: string) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  searchPlaceholder?: string;
}

export function AdminFoundItemsTable({
  items, onClaim, onVerify, onDelete, searchPlaceholder,
}: AdminFoundItemsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const itemToDelete = items.find((i) => i.id === deleteId);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await onDelete(deleteId);
      setDeleteId(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to delete item.';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<FoundItem>[] = [
    {
      accessorKey: 'name',
      header: 'Item Name',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'category',
      header: 'Category',
      accessorKey: 'category',
      cell: ({ row }) => (
        <Badge variant="secondary" className={categoryStyles[row.original.category] ?? ''}>
          {categoryLabels[row.original.category] ?? row.original.category}
        </Badge>
      ),
    },
    { accessorKey: 'location', header: 'Location Found' },
    {
      accessorKey: 'dateFound',
      header: 'Date Found',
      cell: ({ row }) => formatDate(row.original.dateFound),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => (
        <Badge variant="secondary" className={foundStatusStyles[row.original.status] ?? ''}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      ),
    },
    { accessorKey: 'reportedBy', header: 'Reported By' },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex gap-1">
            {item.status === 'unclaimed' && (
              <Button size="xs" variant="outline" onClick={() => onClaim(item.id)}>
                Claim
              </Button>
            )}
            {item.status === 'claimed' && (
              <Button size="xs" variant="outline" onClick={() => onVerify(item.id)}>
                Verify
              </Button>
            )}
            <Button size="xs" variant="ghost" onClick={() => setDeleteId(item.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        searchKey="name"
        searchPlaceholder={searchPlaceholder ?? 'Search found items...'}
      />
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{itemToDelete?.name}&rdquo;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
