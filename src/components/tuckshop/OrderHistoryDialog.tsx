'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import type { Student } from '@/types';

interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: string;
  studentId: string | { _id: string; firstName: string; lastName: string };
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: string;
  processedBy: string | { firstName: string; lastName: string; email: string };
  createdAt: string;
}

interface OrderHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_COLORS: Record<string, string> = {
  wallet: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  wristband: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  cash: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function getStudentName(s: Student): string {
  const u = s.user ?? (s.userId as unknown as { firstName?: string; lastName?: string });
  if (typeof u === 'object' && u !== null && u.firstName) {
    return `${u.firstName} ${u.lastName ?? ''}`.trim();
  }
  if (s.firstName && s.lastName) return `${s.firstName} ${s.lastName}`;
  return s.admissionNumber ?? 'Unknown';
}

export function OrderHistoryDialog({ open, onOpenChange }: OrderHistoryDialogProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!open) return;
    async function fetchStudents() {
      try {
        const res = await apiClient.get('/students');
        const raw = res.data.data ?? res.data;
        const list: Student[] = Array.isArray(raw) ? raw : raw.students ?? raw.data ?? [];
        setStudents(list);
      } catch {
        console.error('Failed to load students');
      }
    }
    fetchStudents();
    setSelectedStudentId('');
    setOrders([]);
    setPage(1);
  }, [open]);

  const fetchOrders = useCallback(async (studentId: string, pageNum: number) => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/tuck-shop/orders/student/${studentId}`, {
        params: { page: pageNum, limit: 10 },
      });
      const raw = res.data.data ?? res.data;
      const orderList = Array.isArray(raw) ? raw : raw.orders ?? raw.data ?? [];
      setOrders(
        orderList.map((o: Record<string, unknown>) => ({
          ...o,
          id: (o._id as string) ?? (o.id as string),
        })),
      );
      setTotalPages(typeof raw.totalPages === 'number' ? raw.totalPages : 1);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchOrders(selectedStudentId, page);
    }
  }, [selectedStudentId, page, fetchOrders]);

  const getProcessedByName = (pb: Order['processedBy']): string => {
    if (typeof pb === 'object' && pb !== null) {
      return `${pb.firstName} ${pb.lastName}`;
    }
    return String(pb);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order History</DialogTitle>
          <DialogDescription>View past tuckshop orders for a student.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select
              value={selectedStudentId}
              onValueChange={(val: unknown) => {
                setSelectedStudentId(val as string);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id ?? s._id} value={s.id ?? s._id ?? ''}>
                    {getStudentName(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && <LoadingSpinner size="sm" />}

          {!loading && selectedStudentId && orders.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No orders found.</p>
          )}

          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="rounded-lg border">
                <button
                  type="button"
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                >
                  <div>
                    <p className="text-sm font-medium">{formatDate(order.createdAt, 'dd MMM yyyy HH:mm')}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={PAYMENT_COLORS[order.paymentMethod] ?? ''}>
                      {order.paymentMethod}
                    </Badge>
                    <span className="font-semibold text-sm">{formatCurrency(order.totalAmount)}</span>
                    {expandedId === order.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                {expandedId === order.id && (
                  <div className="border-t px-3 py-2 space-y-1 bg-muted/20">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.name} x{item.quantity}</span>
                        <span>{formatCurrency(item.totalPrice)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-1 mt-1 text-xs text-muted-foreground">
                      Processed by: {getProcessedByName(order.processedBy)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">Page {page} of {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
