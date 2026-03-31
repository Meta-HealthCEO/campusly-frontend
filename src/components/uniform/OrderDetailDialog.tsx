'use client';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { UniformOrder, UniformOrderStatus, PopulatedStudent, PopulatedUser } from './types';

const STATUS_FLOW: UniformOrderStatus[] = [
  'pending', 'processing', 'confirmed', 'ready', 'collected',
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  collected: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: UniformOrder | null;
  onStatusUpdate: (orderId: string, status: UniformOrderStatus) => void;
}

function getName(value: string | PopulatedStudent | PopulatedUser): string {
  if (typeof value === 'object' && value !== null) {
    return `${value.firstName} ${value.lastName}`;
  }
  return String(value);
}

export function OrderDetailDialog({ open, onOpenChange, order, onStatusUpdate }: OrderDetailDialogProps) {
  if (!order) return null;

  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1
    ? STATUS_FLOW[currentIdx + 1]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>
            Order {order.id.slice(-8)} - placed on {formatDate(order.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status stepper */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {STATUS_FLOW.map((s, i) => {
              const isCurrent = s === order.status;
              const isPast = currentIdx >= 0 && i < currentIdx;
              return (
                <div key={s} className="flex items-center gap-1">
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isCurrent
                        ? STATUS_COLORS[s]
                        : isPast
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <span className="text-muted-foreground">→</span>
                  )}
                </div>
              );
            })}
            {order.status === 'cancelled' && (
              <Badge className={STATUS_COLORS.cancelled}>cancelled</Badge>
            )}
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Student</p>
              <p className="font-medium">{getName(order.studentId)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ordered By</p>
              <p className="font-medium">{getName(order.orderedBy)}</p>
            </div>
          </div>

          {/* Line items */}
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{item.uniformItemId}</TableCell>
                    <TableCell>{item.size}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="text-right text-lg font-bold">
            Total: {formatCurrency(order.totalAmount)}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            {nextStatus && (
              <Button onClick={() => onStatusUpdate(order.id, nextStatus)}>
                Mark as {nextStatus.replace('_', ' ')}
              </Button>
            )}
            {order.status !== 'cancelled' && order.status !== 'collected' && (
              <Button
                variant="destructive"
                onClick={() => onStatusUpdate(order.id, 'cancelled')}
              >
                Cancel Order
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
