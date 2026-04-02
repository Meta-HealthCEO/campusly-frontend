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
import { formatDate } from '@/lib/utils';
import { usePreOrders } from '@/hooks/useUniform';
import { usePreOrderMutations } from '@/hooks/useUniformMutations';
import type { ColumnDef } from '@tanstack/react-table';
import type { PreOrder, PreOrderStatus, PopulatedStudent, PopulatedUser, UniformItem } from './types';

const STATUS_FILTER = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pre_order', label: 'Pre-Order' },
  { value: 'available', label: 'Available' },
  { value: 'ready', label: 'Ready' },
  { value: 'collected', label: 'Collected' },
];

const STATUS_COLORS: Record<string, string> = {
  pre_order: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  available: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  collected: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const PRE_ORDER_FLOW: PreOrderStatus[] = ['pre_order', 'available', 'ready', 'collected'];

function getStudentName(studentId: string | PopulatedStudent): string {
  if (typeof studentId === 'object' && studentId !== null) {
    return `${studentId.firstName} ${studentId.lastName}`;
  }
  return String(studentId).slice(-6);
}

function getItemName(item: string | UniformItem): string {
  if (typeof item === 'object' && item !== null) {
    return item.name;
  }
  return String(item).slice(-6);
}

export function PreOrdersTab() {
  const { preOrders, loading, fetchPreOrders } = usePreOrders();
  const { updatePreOrderStatus, deletePreOrder, extractErrorMessage } = usePreOrderMutations();
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState<PreOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPreOrders(statusFilter);
  }, [fetchPreOrders, statusFilter]);

  const handleStatusUpdate = useCallback(async (preOrderId: string, newStatus: PreOrderStatus) => {
    try {
      await updatePreOrderStatus(preOrderId, newStatus);
      toast.success(`Pre-order status updated to ${newStatus.replace('_', ' ')}`);
      fetchPreOrders(statusFilter);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update pre-order status'));
    }
  }, [fetchPreOrders, statusFilter, updatePreOrderStatus, extractErrorMessage]);

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      await deletePreOrder(deleteDialog.id);
      toast.success('Pre-order deleted');
      setDeleteDialog(null);
      fetchPreOrders(statusFilter);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete pre-order'));
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<PreOrder, unknown>[] = useMemo(() => [
    {
      id: 'item',
      header: 'Item',
      cell: ({ row }) => (
        <span className="font-medium">{getItemName(row.original.uniformItemId)}</span>
      ),
    },
    {
      id: 'student',
      header: 'Student',
      cell: ({ row }) => getStudentName(row.original.studentId),
    },
    {
      accessorKey: 'size',
      header: 'Size',
    },
    {
      accessorKey: 'quantity',
      header: 'Qty',
    },
    {
      id: 'availableDate',
      header: 'Expected Date',
      cell: ({ row }) => formatDate(row.original.availableDate),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={STATUS_COLORS[row.original.status] ?? ''}>
          {row.original.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const po = row.original;
        const currentIdx = PRE_ORDER_FLOW.indexOf(po.status);
        const nextStatus = currentIdx >= 0 && currentIdx < PRE_ORDER_FLOW.length - 1
          ? PRE_ORDER_FLOW[currentIdx + 1]
          : null;

        return (
          <div className="flex items-center gap-1">
            {nextStatus && (
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleStatusUpdate(po.id, nextStatus); }}
              >
                {nextStatus.replace('_', ' ')}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={(e) => { e.stopPropagation(); setDeleteDialog(po); }}
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ], [handleStatusUpdate]);

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

      <DataTable columns={columns} data={preOrders} searchKey="size" searchPlaceholder="Search pre-orders..." />

      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete Pre-Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this pre-order?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
