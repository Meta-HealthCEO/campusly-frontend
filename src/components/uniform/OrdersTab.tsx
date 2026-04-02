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
import { useUniformOrders } from '@/hooks/useUniform';
import { useUniformOrderMutations } from '@/hooks/useUniformMutations';
import { OrderDetailDialog } from './OrderDetailDialog';
import type { ColumnDef } from '@tanstack/react-table';
import type { UniformOrder, UniformOrderStatus, PopulatedStudent, PopulatedUser } from './types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'ready', label: 'Ready' },
  { value: 'collected', label: 'Collected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  collected: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  cancelled: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
};

function getStudentName(studentId: string | PopulatedStudent): string {
  if (typeof studentId === 'object' && studentId !== null) {
    return `${studentId.firstName} ${studentId.lastName}`;
  }
  return String(studentId);
}

function getOrderedByName(orderedBy: string | PopulatedUser): string {
  if (typeof orderedBy === 'object' && orderedBy !== null) {
    return `${orderedBy.firstName} ${orderedBy.lastName}`;
  }
  return String(orderedBy);
}

export function OrdersTab() {
  const { orders, loading, fetchOrders } = useUniformOrders();
  const { updateOrderStatus, deleteOrder, extractErrorMessage } = useUniformOrderMutations();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<UniformOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<UniformOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchOrders(statusFilter);
  }, [fetchOrders, statusFilter]);

  const handleStatusUpdate = useCallback(async (orderId: string, newStatus: UniformOrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
      fetchOrders(statusFilter);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update order status'));
    }
  }, [fetchOrders, statusFilter, updateOrderStatus, extractErrorMessage]);

  const handleView = useCallback((order: UniformOrder) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  }, []);

  const handleDeleteClick = useCallback((order: UniformOrder) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    setDeleting(true);
    try {
      await deleteOrder(orderToDelete.id);
      toast.success('Order deleted');
      setDeleteDialogOpen(false);
      fetchOrders(statusFilter);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete order'));
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<UniformOrder, unknown>[] = useMemo(() => [
    {
      id: 'orderId',
      header: 'Order',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.id.slice(-8)}</span>
      ),
    },
    {
      id: 'student',
      header: 'Student',
      cell: ({ row }) => getStudentName(row.original.studentId),
    },
    {
      id: 'items',
      header: 'Items',
      cell: ({ row }) => (
        <span>{row.original.items.length} item(s)</span>
      ),
    },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.totalAmount)}</span>
      ),
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
      id: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleView(row.original); }}>
            View
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={(e) => { e.stopPropagation(); handleDeleteClick(row.original); }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ], [handleView, handleDeleteClick]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <Select value={statusFilter} onValueChange={(val: unknown) => setStatusFilter(val as string)}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DataTable columns={columns} data={orders} searchKey="id" searchPlaceholder="Search by order ID..." />

      <OrderDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        order={selectedOrder}
        onStatusUpdate={handleStatusUpdate}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this order?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
