import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, mapId, extractErrorMessage } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCurrentParent } from './useCurrentParent';
import type { Invoice, Payment } from '@/types';

interface ParentFeesResult {
  invoices: Invoice[];
  payments: Payment[];
  loading: boolean;
  refetch: () => void;
  payInvoice: (
    invoiceId: string,
    amount: number,
    paymentMethod: string,
  ) => Promise<void>;
}

export function useParentFees(): ParentFeesResult {
  const { user } = useAuthStore();
  const { children, loading: parentLoading } = useCurrentParent();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.schoolId) return;
    setLoading(true);
    try {
      const invRes = await apiClient.get(`/fees/invoices/school/${user.schoolId}`);
      const rawInvoices = unwrapList<Record<string, unknown>>(invRes);
      const allInvoices = rawInvoices.map(mapId) as unknown as Invoice[];

      // Filter to only this parent's children
      const childIds = children.map((c) => c.id ?? (c as unknown as { _id?: string })._id);
      const myInvoices = childIds.length > 0
        ? allInvoices.filter((inv) => {
            const sid = typeof inv.studentId === 'object' && inv.studentId !== null
              ? (inv.studentId as unknown as { _id?: string })._id ?? ''
              : inv.studentId;
            return childIds.includes(sid);
          })
        : allInvoices;
      setInvoices(myInvoices);

      if (myInvoices.length > 0) {
        const paymentPromises = myInvoices.map((inv) =>
          apiClient.get(`/fees/payments/${inv.id}`).catch(() => ({ data: { data: [] } }))
        );
        const paymentResults = await Promise.all(paymentPromises);
        const allPayments = paymentResults.flatMap((r) => unwrapList<Payment>(r));
        setPayments(allPayments);
      }
    } catch {
      console.error('Failed to load fee data');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId, children]);

  useEffect(() => {
    if (parentLoading) return;
    fetchData();
  }, [parentLoading, fetchData]);

  const payInvoice = async (
    invoiceId: string,
    amount: number,
    paymentMethod: string,
  ) => {
    try {
      await apiClient.post(`/fees/invoices/${invoiceId}/pay`, {
        amount,
        paymentMethod,
      });
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Failed to process payment'));
    }
  };

  return {
    invoices,
    payments,
    loading: loading || parentLoading,
    refetch: fetchData,
    payInvoice,
  };
}
